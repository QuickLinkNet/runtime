import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, hasToken } from '../api/client';
import { DeckBuilder } from '../features/deck-builder/DeckBuilder';
import { MatchBoard } from '../features/match/MatchBoard';
import { makeStarterDeck, validateDeck } from '../game/catalog';
import { useGame } from '../game/GameContext';
import type { GameAction, MatchPayload, PlayerIdentity } from '../game/types';
import { BootPage } from '../pages/BootPage';
import { IdentityPage } from '../pages/IdentityPage';
import { MainMenuPage } from '../pages/MainMenuPage';
import { MultiplayerPage } from '../pages/MultiplayerPage';
import { RoomLobbyPage } from '../pages/RoomLobbyPage';
import { ErrorToast } from '../ui/molecules';

type Screen = 'boot' | 'name' | 'menu' | 'deck' | 'multiplayer';

export function App() {
  const { store, dispatch } = useGame();
  const [screen, setScreen] = useState<Screen>('boot');
  const [identity, setIdentity] = useState<PlayerIdentity | null>(null);
  const [resume, setResume] = useState<MatchPayload | null>(null);
  const [deck, setDeck] = useState<string[]>(() => {
    const saved = localStorage.getItem('runtime.deck');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[];
        if (!validateDeck(parsed)) return parsed;
      } catch { /* use starter */ }
    }
    return makeStarterDeck('frontend-backend');
  });
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    async function initialize() {
      if (!hasToken()) { setScreen('name'); return; }
      try {
        const [{ player }, resumeResult] = await Promise.all([api.me(), api.resume()]);
        setIdentity(player);
        setResume(resumeResult.match);
        setScreen('menu');
      } catch {
        localStorage.removeItem('runtime.playerToken');
        setScreen('name');
      }
    }
    void initialize();
  }, []);

  const refresh = useCallback(async () => {
    if (!store.state) return;
    try {
      const result = await api.getState(store.state.roomCode, store.version);
      if (result.changed && result.state) dispatch({ type: 'MATCH', payload: { version: result.version, state: result.state } });
    } catch (error) {
      if (error instanceof ApiError && error.code !== 'MATCH_NOT_FOUND') dispatch({ type: 'ERROR', message: error.message });
    }
  }, [dispatch, store.state, store.version]);

  useEffect(() => {
    if (!store.state || store.state.mode !== 'multi' || !['lobby', 'mulligan', 'active'].includes(store.state.status)) return;
    const interval = window.setInterval(() => { void refresh(); }, document.hidden ? 5000 : 1250);
    const visibility = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', visibility); };
  }, [refresh, store.state]);

  async function run(task: () => Promise<MatchPayload>) {
    dispatch({ type: 'PENDING', value: true });
    try {
      dispatch({ type: 'MATCH', payload: await task() });
    } catch (error) {
      dispatch({ type: 'ERROR', message: error instanceof Error ? error.message : 'Aktion fehlgeschlagen.' });
    }
  }

  async function submit(action: GameAction) {
    if (!store.state || store.pending) return;
    dispatch({ type: 'PENDING', value: true });
    try {
      const payload = await api.submitAction(store.state.roomCode, store.version, action);
      dispatch({ type: 'MATCH', payload });
    } catch (error) {
      if (error instanceof ApiError && ['VERSION_CONFLICT', 'TURN_TIMED_OUT'].includes(error.code)) await refresh();
      dispatch({ type: 'ERROR', message: error instanceof Error ? error.message : 'Aktion fehlgeschlagen.' });
    }
  }

  async function leaveMatch() {
    const state = store.state;
    if (state && state.status !== 'finished') {
      try { await api.leave(state.roomCode); } catch { /* menu remains available */ }
    }
    dispatch({ type: 'CLEAR' });
    setResume(null);
    setScreen('menu');
  }

  if (screen === 'boot') return <BootPage />;
  if (screen === 'name') return <IdentityPage onCreated={(player) => { setIdentity(player); setScreen('menu'); }} />;
  if (!identity) return <BootPage />;

  if (store.state) {
    if (store.state.status === 'lobby') {
      return <RoomLobbyPage state={store.state} pending={store.pending} error={store.error} onStart={() => run(() => api.startMatch(store.state!.roomCode))} onExit={leaveMatch} />;
    }
    return <>
      {store.error && <ErrorToast message={store.error} onClose={() => dispatch({ type: 'ERROR', message: null })} />}
      <MatchBoard state={store.state} pending={store.pending} onAction={submit} onExit={leaveMatch} />
    </>;
  }

  if (screen === 'deck') return <DeckBuilder initialDeck={deck} onCancel={() => setScreen('menu')} onSave={(next) => { localStorage.setItem('runtime.deck', JSON.stringify(next)); setDeck(next); setScreen('menu'); }} />;
  if (screen === 'multiplayer') return <MultiplayerPage pending={store.pending} error={store.error} onBack={() => setScreen('menu')} onCreate={() => run(() => api.createMatch('multi', deck))} onJoin={(code) => run(() => api.joinMatch(code, deck))} />;

  return <MainMenuPage
    identity={identity}
    deck={deck}
    resume={resume}
    pending={store.pending}
    onSingle={() => run(() => api.createMatch('single', deck))}
    onMultiplayer={() => setScreen('multiplayer')}
    onDeck={() => setScreen('deck')}
    onStarter={(key) => { const next = makeStarterDeck(key); setDeck(next); localStorage.setItem('runtime.deck', JSON.stringify(next)); }}
    onResume={() => { if (resume) { dispatch({ type: 'MATCH', payload: resume }); setResume(null); } }}
  />;
}
