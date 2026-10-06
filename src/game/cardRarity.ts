import rawConfig from '../../shared/booster-config.json';
import type { CardRarity } from './types';

export const rarityByCard = rawConfig.rarities as Record<string, CardRarity>;

export const rarityLabels: Record<CardRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  legendary: 'Legendary',
};

export function rarityForCard(definitionId: string): CardRarity | null {
  return rarityByCard[definitionId] ?? null;
}
