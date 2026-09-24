import { cardById } from '../../../game/catalog';
import type { CardDefinition, Domain } from '../../../game/types';

export const techDomains: Domain[] = ['frontend', 'backend', 'infrastructure', 'data', 'security', 'ai'];
export const domainOrder: Domain[] = [...techDomains, 'neutral', 'token'];

export type CatalogFilter = 'selected' | Domain;
export type SortMode = 'cost-asc' | 'cost-desc' | 'name' | 'type';
export type DeckEntry = { card: CardDefinition; count: number };

export function domainsInDeck(deck: string[]): Domain[] {
  const found = new Set(
    deck
      .map((id) => cardById.get(id)?.domain)
      .filter((domain): domain is Domain => Boolean(domain && techDomains.includes(domain))),
  );
  return techDomains.filter((domain) => found.has(domain)).slice(0, 2);
}

export function compareCards(sort: SortMode) {
  return (left: CardDefinition, right: CardDefinition): number => {
    if (sort === 'name') return left.name.localeCompare(right.name, 'de');
    if (sort === 'type') {
      return left.type.localeCompare(right.type, 'de')
        || left.cost - right.cost
        || left.name.localeCompare(right.name, 'de');
    }
    const costDifference = sort === 'cost-desc' ? right.cost - left.cost : left.cost - right.cost;
    return costDifference || left.name.localeCompare(right.name, 'de');
  };
}
