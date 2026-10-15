export type AppScreen = 'name' | 'starter' | 'tutorial' | 'menu' | 'deck' | 'stacks' | 'multiplayer' | 'boosters' | 'account' | 'admin' | 'legal' | 'match';

export function screenFromPath(pathname: string): AppScreen {
  if (pathname === '/identity') return 'name';
  if (pathname === '/starter') return 'starter';
  if (pathname === '/tutorial') return 'tutorial';
  if (pathname === '/stacks') return 'stacks';
  if (pathname === '/deck' || pathname.startsWith('/deck/')) return 'deck';
  if (pathname === '/collection') return 'boosters';
  if (pathname === '/multiplayer') return 'multiplayer';
  if (pathname === '/account') return 'account';
  if (pathname === '/admin') return 'admin';
  if (pathname === '/legal') return 'legal';
  if (pathname.startsWith('/match/')) return 'match';
  return 'menu';
}

export function pathFor(screen: Exclude<AppScreen, 'match'>): string {
  return ({ name: '/identity', starter: '/starter', tutorial: '/tutorial', menu: '/', deck: '/deck', stacks: '/stacks', multiplayer: '/multiplayer', boosters: '/collection', account: '/account', admin: '/admin', legal: '/legal' })[screen];
}

export function matchCodeFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/match\/([A-Z0-9]{5})$/i);
  return match ? match[1].toUpperCase() : null;
}

export function deckSlotFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/deck\/([a-zA-Z0-9_-]+)$/);
  return match ? match[1] : null;
}
