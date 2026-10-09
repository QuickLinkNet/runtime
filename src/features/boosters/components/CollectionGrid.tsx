import { useMemo, useState } from 'react';
import { playableCards } from '../../../game/catalog';
import { baseSetCardIds } from '../../../game/cardSets';
import { rarityByCard, rarityLabels } from '../../../game/cardRarity';
import type { CollectionSnapshot } from '../../../game/types';
import { GameCard } from '../../cards';

export function CollectionGrid({ collection }: { collection: CollectionSnapshot }) {
  const [view, setView] = useState<'owned' | 'missing'>('owned');
  const entries = useMemo(() => playableCards
    .map((card) => ({ card, quantity: collection.cards[card.id] ?? 0 }))
    .filter((entry) => view === 'owned' ? entry.quantity > 0 : entry.quantity === 0)
    .sort((left, right) => left.card.name.localeCompare(right.card.name, 'de')), [collection.cards, view]);
  const ownedCount = playableCards.filter((card) => (collection.cards[card.id] ?? 0) > 0).length;
  const missingCount = playableCards.length - ownedCount;

  return (
    <section className="collection-panel">
      <header>
        <div><span className="eyebrow">DEINE SAMMLUNG</span><h2>Inventory</h2></div>
        <p><b>{ownedCount}</b>/{playableCards.length} Karten · <b>{collection.totalCards}</b> Kopien · <b>{collection.credits}</b> Credits</p>
      </header>
      <nav className="collection-filters" aria-label="Sammlungsansicht">
        <button type="button" className={view === 'owned' ? 'active' : ''} onClick={() => setView('owned')}>Besessen ({ownedCount})</button>
        <button type="button" className={view === 'missing' ? 'active' : ''} onClick={() => setView('missing')}>Noch nicht erworben ({missingCount})</button>
      </nav>
      {entries.length === 0 ? (
        <div className="collection-empty">Alle Karten dieser Ansicht sind bereits vollständig.</div>
      ) : (
        <div className="collection-grid">
          {entries.map(({ card, quantity }) => {
            const rarity = rarityByCard[card.id];
            const owned = quantity > 0;
            return <article className={`collection-card rarity-${rarity} ${owned ? '' : 'is-missing'}`} key={card.id}>
              <GameCard card={{ instanceId: `collection-${card.id}`, definitionId: card.id }} detailsOnHover={false} detailsOnTap />
              <footer><span>{baseSetCardIds.has(card.id) ? 'BASE SET' : rarityLabels[rarity]}</span><b>{owned ? `×${quantity}` : 'NICHT ERWORBEN'}</b></footer>
            </article>;
          })}
        </div>
      )}
    </section>
  );
}
