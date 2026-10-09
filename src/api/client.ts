import type { AdminOverview, AdminPlayerDetail, AdminPlayerSummary, BoosterOpening, CollectionSnapshot, GameAction, GameState, MatchPayload, PlayerIdentity } from '../game/types';
import type { BotProfileKey } from '../game/botProfiles';

interface ApiSuccess<T> { success: true; data: T }
interface ApiFailure { success: false; error: { code: string; message: string } }

export class ApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) {
    super(message);
  }
}

let playerToken = localStorage.getItem('runtime.playerToken') ?? '';
const apiEndpoint = `${import.meta.env.BASE_URL}api/index.php`;

export function setToken(token: string): void {
  playerToken = token;
  localStorage.setItem('runtime.playerToken', token);
}

export function hasToken(): boolean {
  return playerToken.length > 0;
}

async function request<T>(action: string, init?: RequestInit, query = ''): Promise<T> {
  const response = await fetch(`${apiEndpoint}?action=${encodeURIComponent(action)}${query}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(playerToken ? { 'X-Player-Token': playerToken } : {}),
      ...init?.headers,
    },
  });
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    await response.text();
    const detail = response.status === 404
      ? 'Die PHP-API wurde nicht gefunden. Starte sie in einem zweiten Terminal mit „npm run dev:api“.'
      : `Die API hat keine gültige JSON-Antwort geliefert (HTTP ${response.status}).`;
    throw new ApiError('INVALID_API_RESPONSE', detail, response.status || 500);
  }
  const payload = await response.json() as ApiSuccess<T> | ApiFailure;
  if (!payload.success) throw new ApiError(payload.error.code, payload.error.message, response.status);
  return payload.data;
}

export const api = {
  createPlayer: (name: string) => request<{ player: PlayerIdentity; token: string }>('createPlayer', {
    method: 'POST', body: JSON.stringify({ name }),
  }),
  login: (email: string, password: string) => request<{ player: PlayerIdentity; token: string }>('login', {
    method: 'POST', body: JSON.stringify({ email, password }),
  }),
  registerAccount: (name: string, email: string, password: string) => request<{ player: PlayerIdentity; token: string }>('registerAccount', {
    method: 'POST', body: JSON.stringify({ name, email, password }),
  }),
  linkAccount: (email: string, password: string) => request<{ player: PlayerIdentity; token: string }>('linkAccount', {
    method: 'POST', body: JSON.stringify({ email, password }),
  }),
  me: () => request<{ player: PlayerIdentity }>('me'),
  collection: () => request<CollectionSnapshot>('collection'),
  loadout: () => request<{ deck: string[] | null }>('loadout'),
  saveLoadout: (deck: string[]) => request<void>('saveLoadout', { method: 'POST', body: JSON.stringify({ deck }) }),
  openBooster: () => request<BoosterOpening>('openBooster', { method: 'POST', body: '{}' }),
  buyBooster: () => request<CollectionSnapshot>('buyBooster', { method: 'POST', body: '{}' }),
  salvageDuplicates: () => request<CollectionSnapshot>('salvageDuplicates', { method: 'POST', body: '{}' }),
  craftCard: (definitionId: string) => request<CollectionSnapshot>('craftCard', { method: 'POST', body: JSON.stringify({ definitionId }) }),
  claimContract: (key: string) => request<CollectionSnapshot>('claimContract', { method: 'POST', body: JSON.stringify({ key }) }),
  adminOverview: () => request<AdminOverview>('adminOverview'),
  adminPlayers: (query = '') => request<{ players: AdminPlayerSummary[] }>('adminPlayers', undefined, `&query=${encodeURIComponent(query)}`),
  adminPlayer: (playerId: string) => request<AdminPlayerDetail>('adminPlayer', undefined, `&playerId=${encodeURIComponent(playerId)}`),
  adminUpdatePlayer: (playerId: string, credits: number, boosterBalance: number, components: number) => request<AdminPlayerDetail>('adminUpdatePlayer', {
    method: 'POST', body: JSON.stringify({ playerId, credits, boosterBalance, components }),
  }),
  adminResetCollections: () => request<{ deletedCopies: number }>('adminResetCollections', {
    method: 'POST', body: JSON.stringify({ confirmation: 'RESET ALL', doubleConfirmed: true }),
  }),
  adminDeleteGuestPlayers: () => request<{ deletedPlayers: number; deletedOwnedMatches: number }>('adminDeleteGuestPlayers', {
    method: 'POST', body: JSON.stringify({ confirmation: 'DELETE GUESTS', doubleConfirmed: true }),
  }),
  createMatch: (mode: 'single' | 'multi', deck: string[], botProfile?: BotProfileKey) => request<MatchPayload>('createMatch', {
    method: 'POST', body: JSON.stringify({ mode, deck, ...(mode === 'single' && botProfile ? { botProfile } : {}) }),
  }),
  createTutorial: () => request<MatchPayload>('createTutorial', { method: 'POST', body: '{}' }),
  joinMatch: (roomCode: string, deck: string[]) => request<MatchPayload>('joinMatch', {
    method: 'POST', body: JSON.stringify({ roomCode, deck }),
  }),
  startMatch: (roomCode: string) => request<MatchPayload>('startMatch', {
    method: 'POST', body: JSON.stringify({ roomCode }),
  }),
  submitAction: (roomCode: string, expectedVersion: number, action: GameAction) => request<MatchPayload>('submitGameAction', {
    method: 'POST', body: JSON.stringify({ roomCode, expectedVersion, action }),
  }),
  getState: (roomCode: string, version: number) => request<{ changed: boolean; version: number; state?: GameState }>(
    'getMatchState', undefined, `&match=${encodeURIComponent(roomCode)}&version=${version}`,
  ),
  resume: () => request<{ match: MatchPayload | null }>('resumeMatch', { method: 'POST', body: '{}' }),
  leave: (roomCode: string) => request<Record<string, never>>('leaveMatch', {
    method: 'POST', body: JSON.stringify({ roomCode }),
  }),
};
