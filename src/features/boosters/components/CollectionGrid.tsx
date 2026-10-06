import { cardById, playableCards } from '../../../game/catalog';
import { rarityByCard, rarityLabels } from '../../../game/cardRarity';
import type { CollectionSnapshot } from '../../../game/types';
import { GameCard } from '../../cards';

export function CollectionGrid({ collection }: { collection: CollectionSnapshot }) {
  const entries = Object.entries(collection.cards)
    .filter(([, quantity]) => quantity > 0)
    .sort(([left], [right]) => (cardById.get(left)?.name ?? left).localeCompare(cardById.get(right)?.name ?? right, 'de'));

  return (
    <section className="collection-panel">
      <header>
        <div><span className="eyebrow">DEINE SAMMLUNG</span><h2>Inventory</h2></div>
        <p><b>{collection.uniqueCards}</b>/{playableCards.length} Karten · <b>{collection.totalCards}</b> Kopien</p>
      </header>
      {entries.length === 0 ? (
        <div className="collection-empty">Noch leer. Dein erster Booster wartet oben.</div>
      ) : (
        <div className="collection-grid">
          {entries.map(([definitionId, quantity]) => {
            const rarity = rarityByCard[definitionId];
            return <article className={`collection-card rarity-${rarity}`} key={definitionId}>
              <GameCard card={{ instanceId: `owned-${definitionId}`, definitionId }} detailsOnHover={false} detailsOnTap />
              <footer><span>{rarityLabels[rarity]}</span><b>×{quantity}</b></footer>
            </article>;
          })}
        </div>
      )}
    </section>
  );
}
