import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, hasToken } from '../api/client';
import { DeckBuilder } from '../features/deck-builder/DeckBuilder';
import { BoosterLab } from '../features/boosters/BoosterLab';
import { MatchBoard } from '../features/match/MatchBoard';
import { makeStarterDeck, validateDeck, type StarterDeckKey } from '../game/catalog';
import { useGame } from '../game/GameContext';
import type { CollectionSnapshot, GameAction, MatchPayload, PlayerIdentity } from '../game/types';
import { BootPage } from '../pages/BootPage';
import { IdentityPage } from '../pages/IdentityPage';
import { AccountPage } from '../pages/AccountPage';
import { MainMenuPage } from '../pages/MainMenuPage';
import { MultiplayerPage } from '../pages/MultiplayerPage';
import { cacheIdentity, cachedIdentity, clearCachedIdentity } from '../pwa/identityCache';
import { RoomLobbyPage } from '../pages/RoomLobbyPage';
import { StarterDeckPage } from '../pages/StarterDeckPage';
import { TutorialIntroPage } from '../pages/TutorialIntroPage';
import { ErrorToast } from '../ui/molecules';

type Screen = 'boot' | 'name' | 'starter' | 'tutorial' | 'menu' | 'deck' | 'multiplayer' | 'boosters' | 'account';

function loadStoredDeck(): string[] | null {
  const saved = localStorage.getItem('runtime.deck');
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved) as unknown;
    return Array.isArray(parsed) && parsed.every((id) => typeof id === 'string') && !validateDeck(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function actionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `action-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function App() {
  const { store, dispatch } = useGame();
  const [screen, setScreen] = useState<Screen>('boot');
  const [identity, setIdentity] = useState<PlayerIdentity | null>(null);
  const [resume, setResume] = useState<MatchPayload | null>(null);
  const [collection, setCollection] = useState<CollectionSnapshot | null>(null);
  const [deck, setDeck] = useState<string[]>(() => loadStoredDeck() ?? makeStarterDeck('frontend-backend'));
  const [hasSelectedDeck, setHasSelectedDeck] = useState(() => loadStoredDeck() !== null);
  const initialized = useRef(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const frame = window.requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => window.cancelAnimationFrame(frame);
  }, [screen, store.state?.roomCode, store.state?.status]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    async function initialize() {
      if (!hasToken()) { setScreen('name'); return; }
      try {
        const [{ player }, resumeResult, collectionResult, loadoutResult] = await Promise.all([
          api.me(), api.resume(), api.collection().catch(() => null),
          api.loadout().catch(() => null),
        ]);
        setIdentity(player);
        cacheIdentity(player);
        setResume(resumeResult.match);
        setCollection(collectionResult);
        if (loadoutResult?.deck && !validateDeck(loadoutResult.deck)) {
          setDeck(loadoutResult.deck);
          setHasSelectedDeck(true);
        }
        setScreen(hasSelectedDeck ? 'menu' : 'starter');
      } catch {
        const offlineIdentity = cachedIdentity();
        if (!navigator.onLine && offlineIdentity) {
          setIdentity(offlineIdentity);
          setScreen('menu');
          return;
        }
        localStorage.removeItem('runtime.playerToken');
        clearCachedIdentity();
        setScreen('name');
      }
    }
    void initialize();
  }, []);

  const refresh = useCallback(async () => {
    if (!store.state) return;
    if (!navigator.onLine) {
      dispatch({ type: 'SYNC', status: 'offline' });
      return;
    }
    try {
      const result = await api.getState(store.state.roomCode, store.version);
      if (result.changed && result.state) dispatch({ type: 'MATCH', payload: { version: result.version, state: result.state } });
      dispatch({ type: 'SYNC', status: 'connected' });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code !== 'MATCH_NOT_FOUND') dispatch({ type: 'ERROR', message: error.message });
      } else dispatch({ type: 'SYNC', status: 'offline' });
    }
  }, [dispatch, store.state, store.version]);

  useEffect(() => {
    if (!store.state || store.state.mode !== 'multi' || !['lobby', 'mulligan', 'active'].includes(store.state.status)) return;
    const interval = window.setInterval(() => { void refresh(); }, document.hidden ? 5000 : 1250);
    const visibility = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', visibility); };
  }, [refresh, store.state]);

  useEffect(() => {
    const offline = () => dispatch({ type: 'SYNC', status: 'offline' });
    const online = () => {
      dispatch({ type: 'SYNC', status: 'reconnecting' });
      void (async () => {
        try {
          if (store.state) await refresh();
          else {
            const recovered = await api.resume();
            if (recovered.match) setResume(recovered.match);
            dispatch({ type: 'SYNC', status: 'connected' });
          }
        } catch {
          dispatch({ type: 'SYNC', status: 'offline' });
        }
      })();
    };
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    return () => { window.removeEventListener('offline', offline); window.removeEventListener('online', online); };
  }, [dispatch, refresh, store.state]);

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
    if (!navigator.onLine) {
      dispatch({ type: 'SYNC', status: 'offline' });
      dispatch({ type: 'ERROR', message: 'Du bist offline. Die Aktion wird nicht gesendet.' });
      return;
    }
    const outgoing = { ...action, clientActionId: action.clientActionId ?? actionId() };
    dispatch({ type: 'PENDING', value: true });
    try {
      let payload: MatchPayload;
      try {
        payload = await api.submitAction(store.state.roomCode, store.version, outgoing);
      } catch (firstError) {
        if (firstError instanceof ApiError || !navigator.onLine) throw firstError;
        payload = await api.submitAction(store.state.roomCode, store.version, outgoing);
      }
      dispatch({ type: 'MATCH', payload });
      dispatch({ type: 'SYNC', status: 'connected' });
    } catch (error) {
      if (error instanceof ApiError && ['VERSION_CONFLICT', 'TURN_TIMED_OUT'].includes(error.code)) await refresh();
      if (!(error instanceof ApiError)) dispatch({ type: 'SYNC', status: 'offline' });
      dispatch({ type: 'ERROR', message: error instanceof Error ? error.message : 'Aktion fehlgeschlagen.' });
    }
  }

  async function leaveMatch() {
    const state = store.state;
    if (state && state.status !== 'finished') {
      try { await api.leave(state.roomCode); } catch { /* menu remains available */ }
    }
    if (state?.mode === 'tutorial' && state.tutorial?.completed) {
      setIdentity((current) => current ? { ...current, tutorialCompleted: true } : current);
      try { setCollection(await api.collection()); } catch { /* reward is already persisted server-side */ }
    }
    dispatch({ type: 'CLEAR' });
    setResume(null);
    setScreen('menu');
  }

  function rematch() {
    const mode = store.state?.mode === 'multi' ? 'multi' : 'single';
    dispatch({ type: 'CLEAR' });
    void run(() => api.createMatch(mode, deck));
  }

  function editDeckAfterMatch() {
    dispatch({ type: 'CLEAR' });
    setResume(null);
    setScreen(identity?.isAccount ? 'deck' : 'starter');
  }

  function selectStarter(key: StarterDeckKey) {
    const next = makeStarterDeck(key);
    localStorage.setItem('runtime.deck', JSON.stringify(next));
    localStorage.setItem('runtime.deckSelected', '1');
    setDeck(next);
    setHasSelectedDeck(true);
    setScreen(identity?.tutorialCompleted ? 'menu' : 'tutorial');
  }

  async function accountLinked(next: PlayerIdentity) {
    setIdentity(next);
    cacheIdentity(next);
    try {
      await api.saveLoadout(deck);
      setCollection(await api.collection());
    } catch { /* the account itself remains linked; the next refresh retries optional data */ }
    setScreen('menu');
  }

  if (screen === 'boot') return <BootPage />;
  if (screen === 'name') return <IdentityPage onCreated={(player) => { setIdentity(player); setScreen('starter'); }} onLoggedIn={(player) => {
    setIdentity(player);
    cacheIdentity(player);
    void Promise.all([api.collection().catch(() => null), api.loadout().catch(() => null)]).then(([nextCollection, nextLoadout]) => {
      setCollection(nextCollection);
      if (nextLoadout?.deck && !validateDeck(nextLoadout.deck)) {
        setDeck(nextLoadout.deck);
        setHasSelectedDeck(true);
      }
    });
    setScreen('menu');
  }} />;
  if (!identity) return <BootPage />;

  if (screen === 'starter') return <StarterDeckPage currentDeck={deck} allowBack={hasSelectedDeck} onConfirm={selectStarter} onBack={() => setScreen('menu')} />;
  if (screen === 'account') return <AccountPage identity={identity} onLinked={accountLinked} onBack={() => setScreen('menu')} />;

  if (store.state) {
    if (store.state.status === 'lobby') {
      return <RoomLobbyPage state={store.state} pending={store.pending} error={store.error} onStart={() => run(() => api.startMatch(store.state!.roomCode))} onExit={leaveMatch} />;
    }
    return <>
      {store.error && <ErrorToast message={store.error} onClose={() => dispatch({ type: 'ERROR', message: null })} />}
      <MatchBoard state={store.state} pending={store.pending} syncStatus={store.syncStatus} onAction={submit} onRematch={rematch} onDeck={editDeckAfterMatch} onExit={leaveMatch} />
    </>;
  }

  if (screen === 'tutorial') return (
    <>
      {store.error && <ErrorToast message={store.error} onClose={() => dispatch({ type: 'ERROR', message: null })} />}
      <TutorialIntroPage
        completed={identity.tutorialCompleted === true}
        pending={store.pending}
        onStart={() => run(() => api.createTutorial())}
        onBack={() => setScreen('menu')}
      />
    </>
  );

  if (screen === 'deck') return <DeckBuilder initialDeck={deck} collection={collection} onCancel={() => setScreen('menu')} onSave={(next) => { localStorage.setItem('runtime.deck', JSON.stringify(next)); localStorage.setItem('runtime.deckSelected', '1'); setDeck(next); setHasSelectedDeck(true); if (identity.isAccount) void api.saveLoadout(next); setScreen('menu'); }} />;
  if (screen === 'boosters') return <BoosterLab initialCollection={collection} onCollectionChange={setCollection} onBack={() => setScreen('menu')} />;
  if (screen === 'multiplayer') return <MultiplayerPage pending={store.pending} error={store.error} onBack={() => setScreen('menu')} onCreate={() => run(() => api.createMatch('multi', deck))} onJoin={(code) => run(() => api.joinMatch(code, deck))} />;

  return <MainMenuPage
    identity={identity}
    deck={deck}
    resume={resume}
    pending={store.pending}
    onSingle={() => run(() => api.createMatch('single', deck))}
    onMultiplayer={() => setScreen('multiplayer')}
    onDeck={() => setScreen('deck')}
    onBoosters={() => setScreen('boosters')}
    onChooseStarter={() => setScreen('starter')}
    onAccount={() => setScreen('account')}
    onTutorial={() => setScreen('tutorial')}
    onResume={() => { if (resume) { dispatch({ type: 'MATCH', payload: resume }); setResume(null); } }}
  />;
}
