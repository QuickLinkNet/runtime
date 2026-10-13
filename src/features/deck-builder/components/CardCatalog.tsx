import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CardDefinition, CardInstance } from '../../../game/types';
import { GameCard } from '../../cards';
import { maxCopiesFor } from '../model/deckBuilder';

interface CardCatalogProps {
  cards: CardDefinition[];
  selectedDomainCount: number;
  showingNeutral: boolean;
  deckSize: number;
  counts: Map<string, number>;
  owned: Record<string, number> | null;
  collectionMode: boolean;
  infrastructureCount: number;
  columns: 4 | 5;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}

export function CardCatalog({ cards, selectedDomainCount, showingNeutral, deckSize, counts, owned, collectionMode, infrastructureCount, columns, onAdd, onRemove }: CardCatalogProps) {
  const [inspectedCardId, setInspectedCardId] = useState<string | null>(null);
  const inspectedIndex = cards.findIndex((card) => card.id === inspectedCardId);
  const inspectedCard = inspectedIndex >= 0 ? cards[inspectedIndex] : null;

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
      <section className={`catalog-grid columns-${columns}`} aria-label="Kartenkatalog">
      {cards.map((card) => {
        const copies = counts.get(card.id) ?? 0;
        const canAdd = deckSize < 30 && copies < maxCopiesFor(card) && (card.type !== 'infrastructure' || infrastructureCount < 4) && (!collectionMode || copies < (owned?.[card.id] ?? 0));
        const previewCard: CardInstance = {
          instanceId: `catalog-${card.id}`,
          definitionId: card.id,
        };

        return (
          <article className={`catalog-card-shell domain-${card.domain} ${canAdd ? '' : 'is-maxed'}`} key={card.id}>
            <GameCard
              card={previewCard}
              detailsOnHover
              detailsOnTap={false}
              actionLabel="Großansicht öffnen"
              onClick={() => setInspectedCardId(card.id)}
            />
            <footer className="catalog-card-actions">
              <span>Im Deck <b>{copies}/{maxCopiesFor(card)}</b>{owned && <> · Besitz <b>{owned[card.id] ?? 0}</b></>}</span>
              <span className="copy-stepper">
                <button type="button" disabled={copies === 0} onClick={() => onRemove(card.id)} aria-label={`${card.name} entfernen`}>−</button>
                <button type="button" disabled={!canAdd} onClick={() => onAdd(card.id)} aria-label={`${card.name} hinzufügen`}>+</button>
              </span>
            </footer>
          </article>
        );
      })}
      </section>
      {inspectedCard && (
        <CardCatalogLightbox
          card={inspectedCard}
          hasPrevious={cards.length > 1}
          hasNext={cards.length > 1}
          onPrevious={() => setInspectedCardId(cards[(inspectedIndex - 1 + cards.length) % cards.length].id)}
          onNext={() => setInspectedCardId(cards[(inspectedIndex + 1) % cards.length].id)}
          onClose={() => setInspectedCardId(null)}
        />
      )}
    </>
  );
}

interface CardCatalogLightboxProps {
  card: CardDefinition;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}

function CardCatalogLightbox({ card, hasPrevious, hasNext, onPrevious, onNext, onClose }: CardCatalogLightboxProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onPrevious();
      if (event.key === 'ArrowRight') onNext();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, onNext, onPrevious]);

  const previewCard: CardInstance = {
    instanceId: `catalog-lightbox-${card.id}`,
    definitionId: card.id,
  };

  return createPortal(
    <div className="catalog-lightbox" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <div className="catalog-lightbox-dialog" role="dialog" aria-modal="true" aria-label={`Großansicht: ${card.name}`}>
        <button className="catalog-lightbox-close" type="button" onClick={onClose} aria-label="Großansicht schließen">×</button>
        <button className="catalog-lightbox-nav previous" type="button" onClick={onPrevious} disabled={!hasPrevious} aria-label="Vorherige Karte">‹</button>
        <div className="catalog-lightbox-card"><GameCard card={previewCard} detailsOnHover={false} detailsOnTap={false} /></div>
        <button className="catalog-lightbox-nav next" type="button" onClick={onNext} disabled={!hasNext} aria-label="Nächste Karte">›</button>
        <p><b>{card.name}</b><span>← → zum Blättern · Esc zum Schließen</span></p>
      </div>
    </div>,
    document.body,
  );
}
