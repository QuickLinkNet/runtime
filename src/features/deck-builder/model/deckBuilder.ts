import { cardById } from '../../../game/catalog';
import { rarityByCard } from '../../../game/cardRarity';
import type { CardDefinition, Domain } from '../../../game/types';

export const techDomains: Domain[] = ['frontend', 'backend', 'infrastructure', 'data', 'security', 'ai'];
export const domainOrder: Domain[] = [...techDomains, 'neutral', 'token'];

export type CatalogFilter = 'selected' | Domain;
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
    'backend|frontend': { archetype: 'Interface & API · Tempo', recommendation: 'Plane 14+ Karten für das Early Game und halte 2–3 Infrastructures schlank.' },
    'infrastructure|security': { archetype: 'Fortress Stack · Kontrolle', recommendation: 'Baue stabile Services auf; 3–4 Infrastructures und Patches sichern dein Mid Game.' },
    'ai|data': { archetype: 'Model Pipeline · Value', recommendation: 'Frühe Datenquellen finanzieren starke 4+ Compute Plays im späteren Spiel.' },
  };
  const archetype = archetypes[signature] ?? { archetype: 'Custom Stack', recommendation: 'Halte mindestens 8 Early-Karten, 12 Services und 2–4 Infrastructures als stabile Basis.' };
  const warnings: string[] = [];
  if (infrastructure > 4) warnings.push('Zu viele Infrastructures: maximal 4 pro Deck.');
  if (cards.length >= 20 && infrastructure < 2) warnings.push('Sehr wenig Infrastructure: 2–4 sorgen für verlässliche Deploys.');
  if (cards.length >= 20 && early < 8) warnings.push('Wenig Early Game: plane mindestens 8 Karten mit Kosten 0–2 ein.');
  if (cards.length >= 20 && services < 12) warnings.push('Wenig Services: ohne Board-Präsenz wird es schwer, Druck aufzubauen.');
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
