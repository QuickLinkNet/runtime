import { useMemo, useState } from 'react';
import { cardById, domainLabels, makeStarterDeck, playableCards, starterNames, validateDeck } from '../../../game/catalog';
import type { Domain } from '../../../game/types';
import { compareCards, domainOrder, domainsInDeck, techDomains, type CatalogFilter, type DeckEntry, type SortMode } from '../model/deckBuilder';

export function useDeckBuilder(initialDeck: string[], collection: Record<string, number> | null) {
  const [deck, setDeck] = useState([...initialDeck]);
  const [domains, setDomains] = useState<Domain[]>(() => domainsInDeck(initialDeck));
  const [filter, setFilter] = useState<CatalogFilter>('selected');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('cost-asc');
  const [starterKey, setStarterKey] = useState('frontend-backend');
  const [notice, setNotice] = useState<string | null>(null);
  const [ownership, setOwnership] = useState<'all' | 'owned'>('all');

  const counts = useMemo(() => {
    const next = new Map<string, number>();
    for (const id of deck) next.set(id, (next.get(id) ?? 0) + 1);
    return next;
  }, [deck]);

  const visibleCards = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('de');
    return playableCards
      .filter((card) => ownership === 'all' || (collection?.[card.id] ?? 0) > 0)
      .filter((card) => {
        if (filter === 'neutral') return card.domain === 'neutral';
        if (filter === 'selected') return domains.includes(card.domain);
        return card.domain === filter && domains.includes(card.domain);
      })
      .filter((card) => normalizedQuery === '' || [card.name, card.text, card.type, domainLabels[card.domain]]
        .some((value) => value.toLocaleLowerCase('de').includes(normalizedQuery)))
      .sort(compareCards(sort));
  }, [collection, domains, filter, ownership, query, sort]);

  const deckEntries = useMemo<DeckEntry[]>(() => [...counts.entries()]
    .map(([id, count]) => ({ card: cardById.get(id), count }))
    .filter((entry): entry is DeckEntry => Boolean(entry.card))
    .sort((left, right) => {
      const domainDifference = domainOrder.indexOf(left.card.domain) - domainOrder.indexOf(right.card.domain);
      return domainDifference || left.card.cost - right.card.cost || left.card.name.localeCompare(right.card.name, 'de');
    }), [counts]);

  const domainCounts = useMemo(() => new Map<Domain, number>(domainOrder.map((domain) => [
    domain,
    deck.filter((id) => cardById.get(id)?.domain === domain).length,
  ])), [deck]);

  const validation = validateDeck(deck);
  const dirty = deck.join('|') !== initialDeck.join('|');

  function toggleDomain(domain: Domain) {
    if (domains.includes(domain)) {
      const removedCards = domainCounts.get(domain) ?? 0;
      setDomains((current) => current.filter((item) => item !== domain));
      setDeck((current) => current.filter((id) => cardById.get(id)?.domain !== domain));
      if (filter === domain) setFilter('selected');
      setNotice(removedCards > 0
        ? `${domainLabels[domain]} entfernt – ${removedCards} Karten wurden aus dem Deck genommen.`
        : `${domainLabels[domain]} wurde abgewählt.`);
      return;
    }

    if (domains.length >= 2) {
      setNotice('Ein Deck kann genau zwei Tech-Domains enthalten. Wähle zuerst eine aktive Domain ab.');
      return;
    }

    setDomains((current) => [...current, domain]);
    setFilter(domain);
    setNotice(`${domainLabels[domain]} wurde als Deck-Domain hinzugefügt.`);
  }

  function addCard(id: string) {
    const card = cardById.get(id);
    if (!card || deck.length >= 30 || (counts.get(id) ?? 0) >= 2) return;
    if (card.domain !== 'neutral' && !domains.includes(card.domain)) return;
    setDeck((current) => [...current, id]);
    setNotice(null);
  }

  function removeCard(id: string) {
    const index = deck.lastIndexOf(id);
    if (index < 0) return;
    setDeck((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setNotice(null);
  }

  function loadStarter() {
    const nextDeck = makeStarterDeck(starterKey);
    setDeck(nextDeck);
    setDomains(domainsInDeck(nextDeck));
    setFilter('selected');
    setQuery('');
    setNotice(`${starterNames[starterKey]} wurde geladen.`);
  }

  function clearDeck() {
    setDeck([]);
    setNotice('Deck wurde geleert.');
  }

  return {
    deck,
    domains,
    filter,
    query,
    sort,
    starterKey,
    notice,
    ownership,
    counts,
    visibleCards,
    deckEntries,
    domainCounts,
    validation,
    dirty,
    setFilter,
    setQuery,
    setSort,
    setStarterKey,
    setOwnership,
    toggleDomain,
    addCard,
    removeCard,
    loadStarter,
    clearDeck,
    techDomains,
  };
}
