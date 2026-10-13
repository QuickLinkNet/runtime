import { forwardRef, useMemo, useState } from 'react';
import { playableCards } from '../../../game/catalog';
import { baseSetCardIds } from '../../../game/cardSets';
import { rarityByCard, rarityLabels } from '../../../game/cardRarity';
import type { CollectionSnapshot } from '../../../game/types';
import { Button } from '../../../ui/atoms';
import { GameCard } from '../../cards';

interface CollectionGridProps { collection: CollectionSnapshot; onClose: () => void; }

export const CollectionGrid = forwardRef<HTMLElement, CollectionGridProps>(({ collection, onClose }, ref) => {
  const [view, setView] = useState<'owned' | 'missing' | 'all'>('owned');
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('all');
  const entries = useMemo(() => playableCards
    .map((card) => ({ card, quantity: collection.cards[card.id] ?? 0 }))
    .filter((entry) => view === 'all' || (view === 'owned' ? entry.quantity > 0 : entry.quantity === 0))
    .filter((entry) => domain === 'all' || entry.card.domain === domain)
    .filter((entry) => entry.card.name.toLocaleLowerCase('de').includes(query.trim().toLocaleLowerCase('de')))
    .sort((left, right) => left.card.name.localeCompare(right.card.name, 'de')), [collection.cards, domain, query, view]);
  const ownedCount = playableCards.filter((card) => (collection.cards[card.id] ?? 0) > 0).length;
  const missingCount = playableCards.length - ownedCount;
  return <section className="collection-panel" ref={ref} tabIndex={-1} aria-label="Deine Kartensammlung">
    <header><div><span className="eyebrow">DEINE SAMMLUNG</span><h2>Inventory</h2></div><div className="collection-summary"><p><b>{ownedCount}</b>/{playableCards.length} Karten · <b>{collection.totalCards}</b> Kopien · <b>{collection.credits}</b> Credits</p><Button variant="ghost" onClick={onClose}>Zurück zu Boostern</Button></div></header>
    <nav className="collection-filters" aria-label="Sammlungsansicht"><button type="button" className={view === 'owned' ? 'active' : ''} onClick={() => setView('owned')}>Besessen ({ownedCount})</button><button type="button" className={view === 'missing' ? 'active' : ''} onClick={() => setView('missing')}>Noch nicht erworben ({missingCount})</button><button type="button" className={view === 'all' ? 'active' : ''} onClick={() => setView('all')}>Alle Karten ({playableCards.length})</button></nav>
    <div className="collection-tools"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Karte suchen …" aria-label="Karte suchen" /><select value={domain} onChange={(event) => setDomain(event.target.value)} aria-label="Fraktion filtern"><option value="all">Alle Fraktionen</option><option value="frontend">Frontend</option><option value="backend">Backend</option><option value="infrastructure">DevOps</option><option value="data">Data</option><option value="security">Security</option><option value="ai">AI</option><option value="neutral">Neutral</option></select><span>{entries.length} Treffer</span></div>
    {entries.length === 0 ? <div className="collection-empty">Keine Karten für diese Ansicht gefunden.</div> : <div className="collection-grid">{entries.map(({ card, quantity }) => { const rarity = rarityByCard[card.id]; const owned = quantity > 0; return <article className={`collection-card rarity-${rarity} ${owned ? '' : 'is-missing'}`} key={card.id}><GameCard card={{ instanceId: `collection-${card.id}`, definitionId: card.id }} detailsOnHover={false} detailsOnTap visualOnClick /><footer><span>{baseSetCardIds.has(card.id) ? 'BASE SET' : rarityLabels[rarity]}</span><b>{owned ? `×${quantity}` : 'NICHT ERWORBEN'}</b><small>Großansicht</small></footer></article>; })}</div>}
  </section>;
});
