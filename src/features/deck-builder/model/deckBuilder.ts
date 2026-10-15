import { cardById, maxInfrastructurePerDeck } from '../../../game/catalog';
import { rarityByCard } from '../../../game/cardRarity';
import type { CardDefinition, CardType, Domain } from '../../../game/types';
import { t } from '../../../i18n';

export const techDomains: Domain[] = ['frontend', 'backend', 'infrastructure', 'data', 'security', 'ai'];
export const domainOrder: Domain[] = [...techDomains, 'neutral', 'token'];

export type CatalogFilter = 'selected' | Domain;
export type CatalogTypeFilter = 'all' | CardType;
export type SortMode = 'cost-asc' | 'cost-desc' | 'name' | 'type';
export type DeckEntry = { card: CardDefinition; count: number };
export interface DeckHealth { infrastructure: number; services: number; early: number; mid: number; late: number; archetype: string; recommendation: string; warnings: string[]; }

export function analyzeDeck(deck: string[]): DeckHealth {
  const cards = deck.map((id) => cardById.get(id)).filter((card): card is CardDefinition => Boolean(card));
  const infrastructure = cards.filter((card) => card.type === 'infrastructure').length;
  const services = cards.filter((card) => card.type === 'service').length;
  const early = cards.filter((card) => card.cost <= 2).length;
  const mid = cards.filter((card) => card.cost >= 3 && card.cost <= 4).length;
  const late = cards.filter((card) => card.cost >= 5).length;
  const domains = techDomains.filter((domain) => cards.some((card) => card.domain === domain));
  const signature = domains.sort().join('|');
  const archetypes: Record<string, { archetype: string; recommendation: string }> = {
    'backend|frontend': { archetype: t('deck.health.backendFrontend.name'), recommendation: t('deck.health.backendFrontend.recommendation') },
    'infrastructure|security': { archetype: t('deck.health.infrastructureSecurity.name'), recommendation: t('deck.health.infrastructureSecurity.recommendation') },
    'ai|data': { archetype: t('deck.health.aiData.name'), recommendation: t('deck.health.aiData.recommendation') },
  };
  const archetype = archetypes[signature] ?? { archetype: t('deck.health.custom.name'), recommendation: t('deck.health.custom.recommendation') };
  const warnings: string[] = [];
  if (infrastructure > 4) warnings.push(t('deck.warning.tooManyInfrastructure'));
  if (cards.length >= 20 && infrastructure < 2) warnings.push(t('deck.warning.lowInfrastructure'));
  if (cards.length >= 20 && early < 8) warnings.push(t('deck.warning.lowEarly'));
  if (cards.length >= 20 && services < 12) warnings.push(t('deck.warning.lowServices'));
  return { infrastructure, services, early, mid, late, warnings, ...archetype };
}

export function maxCopiesFor(card: CardDefinition): number { return rarityByCard[card.id] === 'legendary' ? 1 : 2; }

export function domainsInDeck(deck: string[]): Domain[] {
  const found = new Set(
    deck
      .map((id) => cardById.get(id)?.domain)
      .filter((domain): domain is Domain => Boolean(domain && techDomains.includes(domain))),
  );
  return techDomains.filter((domain) => found.has(domain)).slice(0, 2);
}

export function localizedDeckValidation(deck: string[]): string | null {
  if (deck.length !== 30) return t('deck.validation.missingCards', { count: 30 - deck.length });
  const counts = new Map<string, number>();
  const domains = new Set<Domain>();
  let infrastructure = 0;
  for (const id of deck) {
    const card = cardById.get(id);
    if (!card || card.token) return t('deck.validation.invalidCard');
    const count = (counts.get(id) ?? 0) + 1;
    const maxCopies = rarityByCard[id] === 'legendary' ? 1 : 2;
    if (count > maxCopies) return t(maxCopies === 1 ? 'deck.validation.legendaryCopies' : 'deck.validation.maxCopies');
    counts.set(id, count);
    if (card.type === 'infrastructure') infrastructure += 1;
    if (card.domain !== 'neutral') domains.add(card.domain);
  }
  if (infrastructure > maxInfrastructurePerDeck) return t('deck.validation.maxInfrastructure', { count: maxInfrastructurePerDeck });
  return domains.size === 2 ? null : t('deck.validation.domains');
}

export function compareCards(sort: SortMode, locale = 'de') {
  return (left: CardDefinition, right: CardDefinition): number => {
    if (sort === 'name') return left.name.localeCompare(right.name, locale);
    if (sort === 'type') {
      return t(`type.${left.type}`).localeCompare(t(`type.${right.type}`), locale)
        || left.cost - right.cost
        || left.name.localeCompare(right.name, locale);
    }
    const costDifference = sort === 'cost-desc' ? right.cost - left.cost : left.cost - right.cost;
    return costDifference || left.name.localeCompare(right.name, locale);
  };
}
