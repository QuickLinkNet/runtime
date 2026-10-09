import rawCardSets from '../../shared/card-sets.json';
import { playableCards } from './catalog';

export const expansionCardIds = new Set(rawCardSets.expansionCardIds);
export const baseSetCardIds = new Set(playableCards.filter((card) => !expansionCardIds.has(card.id)).map((card) => card.id));
