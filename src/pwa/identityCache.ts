import type { PlayerIdentity } from '../game/types';

const IDENTITY_KEY = 'runtime.playerIdentity';

export function cacheIdentity(identity: PlayerIdentity): void {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

export function cachedIdentity(): PlayerIdentity | null {
  const value = localStorage.getItem(IDENTITY_KEY);
  if (!value) return null;
  try {
    const identity = JSON.parse(value) as Partial<PlayerIdentity>;
    return typeof identity.id === 'string' && typeof identity.name === 'string'
      ? { id: identity.id, name: identity.name }
      : null;
  } catch {
    return null;
  }
}

export function clearCachedIdentity(): void {
  localStorage.removeItem(IDENTITY_KEY);
}
