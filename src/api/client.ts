import type { GameAction, GameState, MatchPayload, PlayerIdentity } from '../game/types';

interface ApiSuccess<T> { success: true; data: T }
interface ApiFailure { success: false; error: { code: string; message: string } }

export class ApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) {
    super(message);
  }
}

let playerToken = localStorage.getItem('runtime.playerToken') ?? '';

export function setToken(token: string): void {
  playerToken = token;
  localStorage.setItem('runtime.playerToken', token);
}

export function hasToken(): boolean {
  return playerToken.length > 0;
}

async function request<T>(action: string, init?: RequestInit, query = ''): Promise<T> {
  const response = await fetch(`/api/index.php?action=${encodeURIComponent(action)}${query}`, {
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
  me: () => request<{ player: PlayerIdentity }>('me'),
  createMatch: (mode: 'single' | 'multi', deck: string[]) => request<MatchPayload>('createMatch', {
    method: 'POST', body: JSON.stringify({ mode, deck }),
  }),
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
