import { useMemo, useState } from 'react';
import { cardById, makeStarterDeck, playableCards, starterNames } from '../../../game/catalog';
import type { Domain } from '../../../game/types';
import { useI18n } from '../../../i18n';
import { analyzeDeck, compareCards, domainOrder, domainsInDeck, localizedDeckValidation, maxCopiesFor, techDomains, type CatalogFilter, type CatalogTypeFilter, type DeckEntry, type SortMode } from '../model/deckBuilder';

interface DeckNotice { key: string; values?: Record<string, string | number> }

export function useDeckBuilder(initialDeck: string[], collection: Record<string, number> | null) {
  const { locale, t } = useI18n();
  const [deck, setDeck] = useState([...initialDeck]);
  const [domains, setDomains] = useState<Domain[]>(() => domainsInDeck(initialDeck));
  const [filter, setFilter] = useState<CatalogFilter>('selected');
  const [typeFilter, setTypeFilter] = useState<CatalogTypeFilter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('cost-asc');
  const [starterKey, setStarterKey] = useState('frontend-backend');
  const [notice, setNotice] = useState<DeckNotice | null>(null);
  const [ownership, setOwnership] = useState<'all' | 'owned'>('all');
  const [collectionMode, setCollectionMode] = useState(false);

  const counts = useMemo(() => {
    const next = new Map<string, number>();
    for (const id of deck) next.set(id, (next.get(id) ?? 0) + 1);
    return next;
  }, [deck]);

  const visibleCards = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    return playableCards
      .filter((card) => ownership === 'all' || (collection?.[card.id] ?? 0) > 0)
      .filter((card) => {
        if (filter === 'neutral') return card.domain === 'neutral';
        if (filter === 'selected') return card.domain === 'neutral' || domains.includes(card.domain);
        return card.domain === filter && domains.includes(card.domain);
      })
      .filter((card) => typeFilter === 'all' || card.type === typeFilter)
      .filter((card) => normalizedQuery === '' || [card.name, card.text, t(`type.${card.type}`), t(`domain.${card.domain}`)]
        .some((value) => value.toLocaleLowerCase(locale).includes(normalizedQuery)))
      .sort(compareCards(sort, locale));
  }, [collection, domains, filter, locale, ownership, query, sort, t, typeFilter]);

  const deckEntries = useMemo<DeckEntry[]>(() => [...counts.entries()]
    .map(([id, count]) => ({ card: cardById.get(id), count }))
    .filter((entry): entry is DeckEntry => Boolean(entry.card))
    .sort((left, right) => {
      const domainDifference = domainOrder.indexOf(left.card.domain) - domainOrder.indexOf(right.card.domain);
      return domainDifference || left.card.cost - right.card.cost || left.card.name.localeCompare(right.card.name, locale);
    }), [counts, locale]);

  const domainCounts = useMemo(() => new Map<Domain, number>(domainOrder.map((domain) => [
    domain,
    deck.filter((id) => cardById.get(id)?.domain === domain).length,
  ])), [deck]);

  const collectionValidation = useMemo(() => {
    if (!collectionMode || !collection) return null;
    for (const [id, amount] of counts.entries()) {
      if (amount > (collection[id] ?? 0)) return t('deck.notice.collectionMissing', { name: cardById.get(id)?.name ?? t('deck.notice.thisCard') });
    }
    return null;
  }, [collection, collectionMode, counts, locale, t]);
  const validation = useMemo(() => localizedDeckValidation(deck), [deck, locale]) ?? collectionValidation;
  const health = useMemo(() => analyzeDeck(deck), [deck, locale]);
  const dirty = deck.join('|') !== initialDeck.join('|');

  function toggleDomain(domain: Domain) {
    if (domains.includes(domain)) {
      const removedCards = domainCounts.get(domain) ?? 0;
      setDomains((current) => current.filter((item) => item !== domain));
      setDeck((current) => current.filter((id) => cardById.get(id)?.domain !== domain));
      if (filter === domain) setFilter('selected');
      setNotice(removedCards > 0
        ? { key: 'deck.notice.domainRemovedCards', values: { domain: t(`domain.${domain}`), count: removedCards } }
        : { key: 'deck.notice.domainDeselected', values: { domain: t(`domain.${domain}`) } });
      return;
    }

    if (domains.length >= 2) {
      setNotice({ key: 'deck.notice.maxDomains' });
      return;
    }

    setDomains((current) => [...current, domain]);
    setFilter('selected');
    setNotice({ key: 'deck.notice.domainAdded', values: { domain: t(`domain.${domain}`) } });
  }

  function addCard(id: string) {
    const card = cardById.get(id);
    if (!card || deck.length >= 30 || (counts.get(id) ?? 0) >= maxCopiesFor(card)) return;
    if (card.type === 'infrastructure' && health.infrastructure >= 4) {
      setNotice({ key: 'deck.notice.maxInfrastructure' });
      return;
    }
    if (card.domain !== 'neutral' && !domains.includes(card.domain)) return;
    if (collectionMode && (collection?.[id] ?? 0) <= (counts.get(id) ?? 0)) {
      setNotice({ key: 'deck.notice.copyUnavailable' });
      return;
    }
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
    setNotice({ key: 'deck.notice.starterLoaded', values: { name: starterNames[starterKey] } });
  }

  function clearDeck() {
    setDeck([]);
    setNotice({ key: 'deck.notice.cleared' });
  }

  return {
    deck,
    domains,
    filter,
    typeFilter,
    query,
    sort,
    starterKey,
    notice: notice ? t(notice.key, notice.values) : null,
    ownership,
    collectionMode,
    counts,
    visibleCards,
    deckEntries,
    domainCounts,
    validation,
    health,
    dirty,
    setFilter,
    setTypeFilter,
    setQuery,
    setSort,
    setStarterKey,
    setOwnership,
    setCollectionMode,
    toggleDomain,
    addCard,
    removeCard,
    loadStarter,
    clearDeck,
    techDomains,
  };
}
