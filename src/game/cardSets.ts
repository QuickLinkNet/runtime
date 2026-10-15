import rawCardSets from '../../shared/card-sets.json';
import { getActiveLocale } from '../i18n/runtime';
import { playableCards } from './catalog';

export const expansionCardIds = new Set(rawCardSets.expansionCardIds);
export const baseSetCardIds = new Set(playableCards.filter((card) => !expansionCardIds.has(card.id)).map((card) => card.id));

const names = {
  base: { de: 'Basis-Set', en: 'Base Set', nl: 'Basisset' },
  expansion: { de: 'Set 2: System Upgrade', en: 'Set 2: System Upgrade', nl: 'Set 2: Systeemupgrade' },
};

export const cardSetNames = {} as Record<keyof typeof names, string>;
for (const key of Object.keys(names) as Array<keyof typeof names>) {
  Object.defineProperty(cardSetNames, key, { enumerable: true, get: () => names[key][getActiveLocale()] });
}
