import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError, hasToken } from '../api/client';
import { DeckBuilder } from '../features/deck-builder/DeckBuilder';
import { DeckManagerPage } from '../pages/DeckManagerPage';
import { BoosterLab } from '../features/boosters/BoosterLab';
import { MatchBoard } from '../features/match/MatchBoard';
import { makeStarterDeck, validateDeck, type StarterDeckKey } from '../game/catalog';
import type { BotProfileKey } from '../game/botProfiles';
import { useGame } from '../game/GameContext';
import type { CollectionSnapshot, DeckSlot, GameAction, MatchPayload, PlayerIdentity } from '../game/types';
import { BootPage } from '../pages/BootPage';
import { IdentityPage } from '../pages/IdentityPage';
import { AccountPage } from '../pages/AccountPage';
import { AdminPage } from '../pages/AdminPage';
import { MainMenuPage } from '../pages/MainMenuPage';
import { MultiplayerPage } from '../pages/MultiplayerPage';
import { cacheIdentity, cachedIdentity, clearCachedIdentity } from '../pwa/identityCache';
import { RoomLobbyPage } from '../pages/RoomLobbyPage';
import { StarterDeckPage } from '../pages/StarterDeckPage';
import { TutorialIntroPage } from '../pages/TutorialIntroPage';
import { ErrorToast } from '../ui/molecules';
import { deckSlotFromPath, matchCodeFromPath, pathFor, screenFromPath, type AppScreen } from './routes';

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
  const location = useLocation();
  const navigate = useNavigate();
  const screen = screenFromPath(location.pathname);
  const [identity, setIdentity] = useState<PlayerIdentity | null>(null);
  const [resume, setResume] = useState<MatchPayload | null>(null);
  const [collection, setCollection] = useState<CollectionSnapshot | null>(null);
  const [deck, setDeck] = useState<string[]>(() => loadStoredDeck() ?? makeStarterDeck('frontend-backend'));
  const [deckSlots, setDeckSlots] = useState<DeckSlot[]>([]);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [hasSelectedDeck, setHasSelectedDeck] = useState(() => loadStoredDeck() !== null);
  const initialized = useRef(false);

  const navigateScreen = useCallback((next: Exclude<AppScreen, 'match'>, replace = false) => {
    navigate(pathFor(next), { replace });
  }, [navigate]);
  const navigateMatch = useCallback((roomCode: string, replace = false) => {
    navigate(`/match/${roomCode.toUpperCase()}`, { replace });
  }, [navigate]);

  const applyDeckSlots = useCallback((slots: DeckSlot[]) => {
    setDeckSlots(slots);
    const active = slots.find((slot) => slot.isActive);
    if (active) {
      setDeck(active.deck);
      localStorage.setItem('runtime.deck', JSON.stringify(active.deck));
      localStorage.setItem('runtime.deckSelected', '1');
      setHasSelectedDeck(true);
    }
  }, []);

  useEffect(() => {
    const slotId = deckSlotFromPath(location.pathname);
    if (!slotId || deckSlots.length === 0) return;
    const slot = deckSlots.find((item) => item.id === slotId);
    if (!slot) return;
    setDeck(slot.deck);
    setEditingSlotId(slot.id);
  }, [deckSlots, location.pathname]);

  useEffect(() => {
    const roomCode = matchCodeFromPath(location.pathname);
    if (!identity || !roomCode || store.state?.roomCode === roomCode) return;
    let cancelled = false;
    void api.getState(roomCode, 0)
      .then((payload) => {
        if (!cancelled && payload.state) dispatch({ type: 'MATCH', payload: { version: payload.version, state: payload.state } });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        dispatch({ type: 'ERROR', message: error instanceof Error ? error.message : 'Match konnte nicht geladen werden.' });
        navigateScreen('menu', true);
      });
    return () => { cancelled = true; };
  }, [dispatch, identity, location.pathname, navigateScreen, store.state?.roomCode]);

  useEffect(() => {
    if (!identity || screen === 'match') return;
    if ((screen === 'admin' && !identity.isAdmin) || (['boosters', 'stacks'].includes(screen) && !identity.isAccount)) {
      navigateScreen('menu', true);
    }
  }, [identity, navigateScreen, screen]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const frame = window.requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, store.state?.roomCode, store.state?.status]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    async function initialize() {
      const requestedScreen = screenFromPath(location.pathname);
      const requestedRoom = matchCodeFromPath(location.pathname);
      if (!hasToken()) { navigateScreen('name', true); return; }
      try {
        const [{ player }, resumeResult] = await Promise.all([api.me(), api.resume()]);
        const [collectionResult, slotsResult] = await Promise.all([
          api.collection().catch(() => null),
          player.isAccount ? api.deckSlots().catch(() => null) : Promise.resolve(null),
        ]);
        setIdentity(player);
        cacheIdentity(player);
        setResume(resumeResult.match);
        setCollection(collectionResult);
        if (slotsResult?.slots.length) applyDeckSlots(slotsResult.slots);
        else if (player.isAccount) {
          const created = await api.createDeckSlot('Mein erster Stack', deck);
          applyDeckSlots(created.slots);
        }
        if (requestedRoom) {
          const match = await api.getState(requestedRoom, 0);
          if (match.state) dispatch({ type: 'MATCH', payload: { version: match.version, state: match.state } });
          else navigateScreen('menu', true);
          return;
        }
        const fallback = player.isAccount || hasSelectedDeck ? 'menu' : 'starter';
        const accountOnly = ['boosters', 'stacks', 'admin'].includes(requestedScreen);
        if (requestedScreen === 'name' || (accountOnly && !player.isAccount)) navigateScreen(fallback, true);
      } catch {
        const offlineIdentity = cachedIdentity();
        if (!navigator.onLine && offlineIdentity) {
          setIdentity(offlineIdentity);
          navigateScreen('menu', true);
          return;
        }
        localStorage.removeItem('runtime.playerToken');
        clearCachedIdentity();
        navigateScreen('name', true);
      }
    }
    void initialize();
  }, [applyDeckSlots, deck, dispatch, hasSelectedDeck, location.pathname, navigateScreen]);

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
      const payload = await task();
      dispatch({ type: 'MATCH', payload });
      navigateMatch(payload.state.roomCode);
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
    dispatch({ type: 'CLEAR' });
    setResume(null);
    navigateScreen('menu');
    if (state && state.status !== 'finished') {
      try { await api.leave(state.roomCode); } catch { /* local exit remains authoritative */ }
    }
    if (state?.mode === 'tutorial' && state.tutorial?.completed) {
      setIdentity((current) => current ? { ...current, tutorialCompleted: true } : current);
      try { setCollection(await api.collection()); } catch { /* reward is already persisted server-side */ }
    }
    if (state?.status === 'finished' && identity?.isAccount) {
      try { setCollection(await api.collection()); } catch { /* the result remains visible even when the refresh fails */ }
    }
  }

  function rematch() {
    const mode = store.state?.mode === 'multi' ? 'multi' : 'single';
    const botProfile = Object.values(store.state?.players ?? {}).find((player) => player.isBot)?.botProfile as BotProfileKey | null | undefined;
    dispatch({ type: 'CLEAR' });
    void run(() => api.createMatch(mode, deck, botProfile ?? 'junior'));
  }

  function editDeckAfterMatch() {
    dispatch({ type: 'CLEAR' });
    setResume(null);
    navigateScreen(identity?.isAccount ? 'deck' : 'starter');
  }

  function selectStarter(key: StarterDeckKey) {
    const next = makeStarterDeck(key);
    localStorage.setItem('runtime.deck', JSON.stringify(next));
    localStorage.setItem('runtime.deckSelected', '1');
    setDeck(next);
    setHasSelectedDeck(true);
    if (identity?.isAccount) void api.saveLoadout(next).then(() => api.deckSlots()).then((snapshot) => applyDeckSlots(snapshot.slots));
    navigateScreen(identity?.tutorialCompleted ? 'menu' : 'tutorial');
  }

  async function saveDeckSlot(slotId: string | null, name: string, nextDeck: string[]) {
    if (!identity?.isAccount) return;
    const snapshot = slotId
      ? await api.updateDeckSlot(slotId, name, nextDeck)
      : await api.createDeckSlot(name, nextDeck);
    applyDeckSlots(snapshot.slots);
  }

  async function accountLinked(next: PlayerIdentity) {
    setIdentity(next);
    cacheIdentity(next);
    try {
      await api.saveLoadout(deck);
      setCollection(await api.collection());
      applyDeckSlots((await api.deckSlots()).slots);
    } catch { /* the account itself remains linked; the next refresh retries optional data */ }
    navigateScreen('menu');
  }

  if (screen === 'name') return <IdentityPage onCreated={(player) => { setIdentity(player); navigateScreen('starter', true); }} onLoggedIn={(player) => {
    setIdentity(player);
    cacheIdentity(player);
    void Promise.all([api.collection().catch(() => null), player.isAccount ? api.deckSlots().catch(() => null) : Promise.resolve(null)]).then(([nextCollection, slots]) => {
      setCollection(nextCollection);
      if (slots?.slots.length) applyDeckSlots(slots.slots);
    });
    navigateScreen('menu', true);
  }} />;
  if (!identity) return <BootPage />;

  if (screen === 'starter') return <StarterDeckPage currentDeck={deck} allowBack={hasSelectedDeck} onConfirm={selectStarter} onBack={() => navigateScreen('menu')} />;
  if (screen === 'account') return <AccountPage identity={identity} onLinked={accountLinked} onBack={() => navigateScreen('menu')} />;
  if (screen === 'admin' && identity.isAdmin) return <AdminPage onBack={() => navigateScreen('menu')} />;

  if (screen === 'match' && store.state) {
    if (store.state.status === 'lobby') {
      return <RoomLobbyPage state={store.state} pending={store.pending} error={store.error} onStart={() => run(() => api.startMatch(store.state!.roomCode))} onExit={leaveMatch} />;
    }
    return <>
      {store.error && <ErrorToast message={store.error} onClose={() => dispatch({ type: 'ERROR', message: null })} />}
      <MatchBoard state={store.state} pending={store.pending} syncStatus={store.syncStatus} onAction={submit} onRematch={rematch} onDeck={editDeckAfterMatch} onExit={leaveMatch} />
    </>;
  }

  if (screen === 'match') return <BootPage />;

  if (screen === 'tutorial') return (
    <>
      {store.error && <ErrorToast message={store.error} onClose={() => dispatch({ type: 'ERROR', message: null })} />}
      <TutorialIntroPage
        completed={identity.tutorialCompleted === true}
        pending={store.pending}
        onStart={() => run(() => api.createTutorial())}
        onBack={() => navigateScreen('menu')}
      />
    </>
  );

  if (screen === 'stacks' && identity.isAccount) return <>{store.error && <ErrorToast message={store.error} onClose={() => dispatch({ type: 'ERROR', message: null })} />}<DeckManagerPage
    slots={deckSlots}
    pending={store.pending}
    onBack={() => navigateScreen('menu')}
    onActivate={(slotId) => { void api.activateDeckSlot(slotId).then((snapshot) => applyDeckSlots(snapshot.slots)).catch((error: unknown) => dispatch({ type: 'ERROR', message: error instanceof Error ? error.message : 'Stack konnte nicht aktiviert werden.' })); }}
    onEdit={(slotId) => { const slot = deckSlots.find((item) => item.id === slotId); if (slot) { setDeck(slot.deck); setEditingSlotId(slotId); navigate(`/deck/${slotId}`); } }}
    onCreate={(name) => { const active = deckSlots.find((slot) => slot.isActive); void saveDeckSlot(null, name, active?.deck ?? deck).catch((error: unknown) => dispatch({ type: 'ERROR', message: error instanceof Error ? error.message : 'Stack konnte nicht angelegt werden.' })); }}
    onRename={(slotId, name) => { const slot = deckSlots.find((item) => item.id === slotId); if (slot) void saveDeckSlot(slotId, name, slot.deck).catch((error: unknown) => dispatch({ type: 'ERROR', message: error instanceof Error ? error.message : 'Stack konnte nicht umbenannt werden.' })); }}
    onDuplicate={(slotId, name) => { void api.duplicateDeckSlot(slotId, name).then((snapshot) => applyDeckSlots(snapshot.slots)).catch((error: unknown) => dispatch({ type: 'ERROR', message: error instanceof Error ? error.message : 'Stack konnte nicht dupliziert werden.' })); }}
    onDelete={(slotId) => { void api.deleteDeckSlot(slotId).then((snapshot) => applyDeckSlots(snapshot.slots)).catch((error: unknown) => dispatch({ type: 'ERROR', message: error instanceof Error ? error.message : 'Stack konnte nicht gelöscht werden.' })); }}
  /></>;
  if (screen === 'deck') return <DeckBuilder initialDeck={deck} collection={collection} onCancel={() => navigateScreen(identity.isAccount ? 'stacks' : 'menu')} onSave={(next) => { localStorage.setItem('runtime.deck', JSON.stringify(next)); localStorage.setItem('runtime.deckSelected', '1'); setDeck(next); setHasSelectedDeck(true); if (identity.isAccount) { const slot = deckSlots.find((item) => item.id === editingSlotId) ?? deckSlots.find((item) => item.isActive); void saveDeckSlot(slot?.id ?? null, slot?.name ?? 'Mein Stack', next).then(() => { setEditingSlotId(null); navigateScreen('stacks'); }).catch((error: unknown) => dispatch({ type: 'ERROR', message: error instanceof Error ? error.message : 'Stack konnte nicht gespeichert werden.' })); } else navigateScreen('menu'); }} />;
  if (screen === 'boosters') return <BoosterLab initialCollection={collection} onCollectionChange={setCollection} onBack={() => navigateScreen('menu')} />;
  if (screen === 'multiplayer') return <MultiplayerPage pending={store.pending} error={store.error} onBack={() => navigateScreen('menu')} onCreate={() => run(() => api.createMatch('multi', deck))} onJoin={(code) => run(() => api.joinMatch(code, deck))} />;

  return <MainMenuPage
    identity={identity}
    deck={deck}
    activeDeckName={deckSlots.find((slot) => slot.isActive)?.name}
    collection={collection}
    resume={resume}
    pending={store.pending}
    onSingle={(botProfile) => run(() => api.createMatch('single', deck, botProfile))}
    onMultiplayer={() => navigateScreen('multiplayer')}
    onDeck={() => navigateScreen(identity.isAccount ? 'stacks' : 'deck')}
    onBoosters={() => navigateScreen('boosters')}
    onChooseStarter={() => navigateScreen(identity.isAccount ? 'stacks' : 'starter')}
    onAccount={() => navigateScreen('account')}
    onAdmin={() => navigateScreen('admin')}
    onTutorial={() => navigateScreen('tutorial')}
    onResume={() => { if (resume) { dispatch({ type: 'MATCH', payload: resume }); navigateMatch(resume.state.roomCode); setResume(null); } }}
  />;
}
