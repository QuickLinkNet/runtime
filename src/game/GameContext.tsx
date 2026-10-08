import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import type { GameState, MatchPayload } from './types';

interface GameStore {
  state: GameState | null;
  version: number;
  pending: boolean;
  error: string | null;
  syncStatus: 'connected' | 'reconnecting' | 'offline';
}

type StoreAction =
  | { type: 'MATCH'; payload: MatchPayload }
  | { type: 'PENDING'; value: boolean }
  | { type: 'ERROR'; message: string | null }
  | { type: 'SYNC'; status: GameStore['syncStatus'] }
  | { type: 'CLEAR' };

const initial: GameStore = { state: null, version: 0, pending: false, error: null, syncStatus: 'connected' };

function reducer(store: GameStore, action: StoreAction): GameStore {
  switch (action.type) {
    case 'MATCH': return { ...store, state: action.payload.state, version: action.payload.version, pending: false, error: null };
    case 'PENDING': return { ...store, pending: action.value };
    case 'ERROR': return { ...store, pending: false, error: action.message };
    case 'SYNC': return { ...store, syncStatus: action.status };
    case 'CLEAR': return initial;
  }
}

const GameContext = createContext<{ store: GameStore; dispatch: Dispatch<StoreAction> } | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [store, dispatch] = useReducer(reducer, initial);
  return <GameContext.Provider value={{ store, dispatch }}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('GameContext missing');
  return context;
}
