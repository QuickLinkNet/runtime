import rawCards from '../../shared/cards.json';
import rawStarterDecks from '../../shared/starter-decks.json';
import { cardCopy } from '../i18n/cardTranslations';
import { getActiveLocale } from '../i18n/runtime';
import { rarityByCard } from './cardRarity';
import type { CardDefinition, Domain } from './types';

const sourceCards = rawCards as CardDefinition[];

function localizedCard(source: CardDefinition): CardDefinition {
  const card = { ...source };
  for (const field of ['name', 'text', 'flavorText'] as const) {
    Object.defineProperty(card, field, {
      enumerable: true,
      get: () => cardCopy(source, getActiveLocale())[field],
    });
  }
  return card;
}

function localizedLabels<T extends string>(values: Record<T, Record<'de' | 'en' | 'nl', string>>): Record<T, string> {
  const labels = {} as Record<T, string>;
  for (const [key, translations] of Object.entries(values) as Array<[T, Record<'de' | 'en' | 'nl', string>]>) {
    Object.defineProperty(labels, key, { enumerable: true, get: () => translations[getActiveLocale()] });
  }
  return labels;
}

export const cards = sourceCards.map(localizedCard);
export const playableCards = cards.filter((card) => !card.token);
export const cardById = new Map(cards.map((card) => [card.id, card]));
export const maxInfrastructurePerDeck = 4;
export type StarterDeckKey = keyof typeof rawStarterDecks;

export const domainLabels = localizedLabels<Domain>({
  frontend: { de: 'Frontend', en: 'Frontend', nl: 'Frontend' },
  backend: { de: 'Backend', en: 'Backend', nl: 'Backend' },
  infrastructure: { de: 'DevOps', en: 'DevOps', nl: 'DevOps' },
  data: { de: 'Data', en: 'Data', nl: 'Data' },
  security: { de: 'Security', en: 'Security', nl: 'Security' },
  ai: { de: 'AI', en: 'AI', nl: 'AI' },
  neutral: { de: 'Neutral', en: 'Neutral', nl: 'Neutraal' },
  token: { de: 'Token', en: 'Token', nl: 'Token' },
});

export const starterNames: Record<string, string> = localizedLabels({
  'frontend-backend': { de: 'Interface & API', en: 'Interface & API', nl: 'Interface & API' },
  'infrastructure-security': { de: 'Fortress Stack', en: 'Fortress Stack', nl: 'Vesting-stack' },
  'data-ai': { de: 'Model Pipeline', en: 'Model Pipeline', nl: 'Model-pijplijn' },
});

export function makeStarterDeck(key: string): string[] {
  const decks = rawStarterDecks as Record<string, string[]>;
  return [...(decks[key] ?? decks['frontend-backend'])];
}

export function starterKeyForDeck(deck: string[]): StarterDeckKey | null {
  const signature = [...deck].sort().join('|');
  for (const key of Object.keys(starterNames) as StarterDeckKey[]) {
    if ([...rawStarterDecks[key]].sort().join('|') === signature) return key;
  }
  return null;
}

export function validateDeck(deck: string[]): string | null {
  const locale = getActiveLocale();
  if (deck.length !== 30) return {
    de: `Noch ${30 - deck.length} Karten bis zum vollständigen Deck.`,
    en: `${30 - deck.length} more cards needed to complete the deck.`,
    nl: `Nog ${30 - deck.length} kaarten nodig voor een compleet deck.`,
  }[locale];
  const counts = new Map<string, number>();
  const domains = new Set<Domain>();
  let infrastructure = 0;
  for (const id of deck) {
    const card = cardById.get(id);
    if (!card || card.token) return { de: 'Das Deck enthält eine ungültige Karte.', en: 'The deck contains an invalid card.', nl: 'Het deck bevat een ongeldige kaart.' }[locale];
    const count = (counts.get(id) ?? 0) + 1;
    const maxCopies = rarityByCard[id] === 'legendary' ? 1 : 2;
    if (count > maxCopies) return maxCopies === 1
      ? { de: 'Legendary-Karten dürfen nur einmal im Deck sein.', en: 'Legendary cards may only appear once in a deck.', nl: 'Legendary-kaarten mogen maar één keer in een deck voorkomen.' }[locale]
      : { de: 'Maximal zwei Kopien pro Karte.', en: 'No more than two copies of each card.', nl: 'Maximaal twee exemplaren van elke kaart.' }[locale];
    counts.set(id, count);
    if (card.type === 'infrastructure') infrastructure += 1;
    if (card.domain !== 'neutral') domains.add(card.domain);
  }
  if (infrastructure > maxInfrastructurePerDeck) return {
    de: `Maximal ${maxInfrastructurePerDeck} Infrastructure-Karten pro Deck.`,
    en: `No more than ${maxInfrastructurePerDeck} Infrastructure cards per deck.`,
    nl: `Maximaal ${maxInfrastructurePerDeck} Infrastructure-kaarten per deck.`,
  }[locale];
  return domains.size === 2 ? null : {
    de: 'Wähle Karten aus genau zwei Tech-Domains.',
    en: 'Choose cards from exactly two tech domains.',
    nl: 'Kies kaarten uit precies twee techdomeinen.',
  }[locale];
}
