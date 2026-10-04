import { useMemo, useState } from 'react';
import type { CardDefinition, CardInstance } from '../../../game/types';
import { GameCard } from '../../cards';
import { CardSpotlight } from './CardSpotlight';

interface CardCatalogProps {
  cards: CardDefinition[];
  selectedDomainCount: number;
  showingNeutral: boolean;
  deckSize: number;
  counts: Map<string, number>;
  columns: 4 | 5;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}

export function CardCatalog({ cards, selectedDomainCount, showingNeutral, deckSize, counts, columns, onAdd, onRemove }: CardCatalogProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const spotlightCard = useMemo(() => {
    const activeId = hoveredId ?? pinnedId;
    return cards.find((card) => card.id === activeId) ?? cards[0];
  }, [cards, hoveredId, pinnedId]);

  if (selectedDomainCount === 0 && !showingNeutral) {
    return (
      <section className="catalog-grid" aria-label="Kartenkatalog">
        <div className="catalog-empty"><b>Wähle zuerst deine Tech-Domains.</b><span>Danach erscheinen hier die passenden Karten.</span></div>
      </section>
    );
  }

  if (cards.length === 0) {
    return (
      <section className="catalog-grid" aria-label="Kartenkatalog">
        <div className="catalog-empty"><b>Keine Karten gefunden.</b><span>Ändere den Filter oder den Suchbegriff.</span></div>
      </section>
    );
  }

  return (
    <>
      <section className={`catalog-grid columns-${columns}`} aria-label="Kartenkatalog" onMouseLeave={() => setHoveredId(null)}>
        {cards.map((card) => {
          const copies = counts.get(card.id) ?? 0;
          const canAdd = deckSize < 30 && copies < 2;
          const previewCard: CardInstance = {
            instanceId: `catalog-${card.id}`,
            definitionId: card.id,
          };

          return (
            <article
              className={`catalog-card-shell domain-${card.domain} ${canAdd ? '' : 'is-maxed'} ${spotlightCard?.id === card.id ? 'is-spotlighted' : ''}`}
              key={card.id}
              onMouseEnter={() => setHoveredId(card.id)}
              onFocusCapture={() => setHoveredId(card.id)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setHoveredId(null);
              }}
            >
              <GameCard
                card={previewCard}
                detailsOnHover={false}
                detailsOnTap
                actionLabel="In der großen Vorschau anzeigen"
                onClick={() => setPinnedId(card.id)}
              />
              <footer className="catalog-card-actions">
                <span>Im Deck <b>{copies}/2</b></span>
                <span className="copy-stepper">
                  <button type="button" disabled={copies === 0} onClick={() => onRemove(card.id)} aria-label={`${card.name} entfernen`}>−</button>
                  <button type="button" disabled={!canAdd} onClick={() => onAdd(card.id)} aria-label={`${card.name} hinzufügen`}>+</button>
                </span>
              </footer>
            </article>
          );
        })}
      </section>

      {spotlightCard && (
        <CardSpotlight
          card={spotlightCard}
          copies={counts.get(spotlightCard.id) ?? 0}
          canAdd={deckSize < 30 && (counts.get(spotlightCard.id) ?? 0) < 2}
          onAdd={() => onAdd(spotlightCard.id)}
          onRemove={() => onRemove(spotlightCard.id)}
        />
      )}
    </>
  );
}
