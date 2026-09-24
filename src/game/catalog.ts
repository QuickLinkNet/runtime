import rawCards from '../../shared/cards.json';
import type { CardDefinition, Domain } from './types';

export const cards = rawCards as CardDefinition[];
export const playableCards = cards.filter((card) => !card.token);
export const cardById = new Map(cards.map((card) => [card.id, card]));

export const domainLabels: Record<Domain, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  infrastructure: 'Infrastructure',
  data: 'Data',
  security: 'Security',
  ai: 'AI',
  neutral: 'Neutral',
  token: 'Token',
};

const pairs: Record<string, [Domain, Domain]> = {
  'frontend-backend': ['frontend', 'backend'],
  'infrastructure-security': ['infrastructure', 'security'],
  'data-ai': ['data', 'ai'],
};

export const starterNames: Record<string, string> = {
  'frontend-backend': 'Interface & API',
  'infrastructure-security': 'Fortress Stack',
  'data-ai': 'Model Pipeline',
};

export function makeStarterDeck(key: string): string[] {
  const pair = pairs[key] ?? pairs['frontend-backend'];
  const deck: string[] = [];
  playableCards
    .filter((card) => pair.includes(card.domain))
    .forEach((card) => deck.push(card.id, card.id));
  playableCards
    .filter((card) => card.domain === 'neutral')
    .slice(0, 3)
    .forEach((card) => deck.push(card.id, card.id));
  return deck;
}

export function validateDeck(deck: string[]): string | null {
  if (deck.length !== 30) return `Noch ${30 - deck.length} Karten bis zum vollständigen Deck.`;
  const counts = new Map<string, number>();
  const domains = new Set<Domain>();
  for (const id of deck) {
    const card = cardById.get(id);
    if (!card || card.token) return 'Das Deck enthält eine ungültige Karte.';
    const count = (counts.get(id) ?? 0) + 1;
    if (count > 2) return 'Maximal zwei Kopien pro Karte.';
    counts.set(id, count);
    if (card.domain !== 'neutral') domains.add(card.domain);
  }
  return domains.size === 2 ? null : 'Wähle Karten aus genau zwei Tech-Domains.';
}
