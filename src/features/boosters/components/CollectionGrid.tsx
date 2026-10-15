import { forwardRef, useMemo, useState } from 'react';
import { playableCards } from '../../../game/catalog';
import { baseSetCardIds } from '../../../game/cardSets';
import { rarityByCard } from '../../../game/cardRarity';
import type { CollectionSnapshot } from '../../../game/types';
import { Button } from '../../../ui/atoms';
import { useI18n } from '../../../i18n';
import { GameCard } from '../../cards';

interface CollectionGridProps { collection: CollectionSnapshot; onClose: () => void; }

export const CollectionGrid = forwardRef<HTMLElement, CollectionGridProps>(({ collection, onClose }, ref) => {
  const { t, locale } = useI18n();
  const [view, setView] = useState<'owned' | 'missing' | 'all'>('owned');
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('all');
  const entries = useMemo(() => playableCards
    .map((card) => ({ card, quantity: collection.cards[card.id] ?? 0 }))
    .filter((entry) => view === 'all' || (view === 'owned' ? entry.quantity > 0 : entry.quantity === 0))
    .filter((entry) => domain === 'all' || entry.card.domain === domain)
    .filter((entry) => entry.card.name.toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale)))
    .sort((left, right) => left.card.name.localeCompare(right.card.name, locale)), [collection.cards, domain, locale, query, view]);
  const ownedCount = playableCards.filter((card) => (collection.cards[card.id] ?? 0) > 0).length;
  const missingCount = playableCards.length - ownedCount;
  return <section className="collection-panel" ref={ref} tabIndex={-1} aria-label={t('collection.aria')}>
    <header><div><span className="eyebrow">{t('collection.eyebrow')}</span><h2>{t('collection.title')}</h2></div><div className="collection-summary"><p>{t('collection.summary', { owned: ownedCount, total: playableCards.length, copies: collection.totalCards, credits: collection.credits })}</p><Button variant="ghost" onClick={onClose}>{t('collection.back')}</Button></div></header>
    <nav className="collection-filters" aria-label={t('collection.viewAria')}><button type="button" className={view === 'owned' ? 'active' : ''} onClick={() => setView('owned')}>{t('collection.owned', { count: ownedCount })}</button><button type="button" className={view === 'missing' ? 'active' : ''} onClick={() => setView('missing')}>{t('collection.missing', { count: missingCount })}</button><button type="button" className={view === 'all' ? 'active' : ''} onClick={() => setView('all')}>{t('collection.all', { count: playableCards.length })}</button></nav>
    <div className="collection-tools"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('collection.searchPlaceholder')} aria-label={t('collection.searchAria')} /><select value={domain} onChange={(event) => setDomain(event.target.value)} aria-label={t('collection.filterFaction')}><option value="all">{t('collection.allFactions')}</option>{['frontend', 'backend', 'infrastructure', 'data', 'security', 'ai', 'neutral'].map((value) => <option value={value} key={value}>{t(`domain.${value}`)}</option>)}</select><span>{t('collection.results', { count: entries.length })}</span></div>
    {entries.length === 0 ? <div className="collection-empty">{t('collection.empty')}</div> : <div className="collection-grid">{entries.map(({ card, quantity }) => { const rarity = rarityByCard[card.id]; const owned = quantity > 0; return <article className={`collection-card rarity-${rarity} ${owned ? '' : 'is-missing'}`} key={card.id}><GameCard card={{ instanceId: `collection-${card.id}`, definitionId: card.id }} detailsOnHover={false} detailsOnTap visualOnClick /><footer><span>{baseSetCardIds.has(card.id) ? t('collection.baseSet') : t(`rarity.${rarity}`)}</span><b>{owned ? `×${quantity}` : t('collection.notOwned')}</b><small>{t('collection.largeView')}</small></footer></article>; })}</div>}
  </section>;
});
