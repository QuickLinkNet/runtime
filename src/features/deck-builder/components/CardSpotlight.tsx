import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cardArtworkById } from '../../../game/cardArtwork';
import { domainLabels } from '../../../game/catalog';
import type { CardDefinition, CardInstance } from '../../../game/types';
import { GameCard } from '../../cards';

interface CardSpotlightProps {
  card: CardDefinition;
  copies: number;
  canAdd: boolean;
  onAdd: () => void;
  onRemove: () => void;
}

export function CardSpotlight({ card, copies, canAdd, onAdd, onRemove }: CardSpotlightProps) {
  const [artworkOpen, setArtworkOpen] = useState(false);
  const artwork = cardArtworkById[card.id];
  const previewCard: CardInstance = {
    instanceId: `spotlight-${card.id}`,
    definitionId: card.id,
  };

  useEffect(() => {
    if (!artworkOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setArtworkOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [artworkOpen]);

  return (
    <aside className={`deck-spotlight domain-${card.domain}`} aria-label={`Vorschau für ${card.name}`}>
      <header className="spotlight-heading">
        <span><i /> CARD SPOTLIGHT</span>
        <span className="spotlight-card-state">Kartenansicht</span>
      </header>

      <div className="spotlight-card-stage">
        <GameCard
          card={previewCard}
          detailsOnHover={false}
          actionLabel={artwork ? 'Artwork groß anzeigen' : 'Karte anzeigen'}
          onClick={artwork ? () => setArtworkOpen(true) : undefined}
        />
      </div>

      <div className="spotlight-card-caption">
        <span>{domainLabels[card.domain]} · {card.type}</span>
        {artwork && <button type="button" onClick={() => setArtworkOpen(true)}>Artwork öffnen ↗</button>}
      </div>

      <footer className="spotlight-actions">
        <span>Im Deck <b>{copies}/2</b></span>
        <div>
          <button type="button" disabled={copies === 0} onClick={onRemove} aria-label={`${card.name} entfernen`}>−</button>
          <button type="button" disabled={!canAdd} onClick={onAdd} aria-label={`${card.name} hinzufügen`}>+</button>
        </div>
      </footer>

      {artworkOpen && artwork && createPortal(
        <div className="artwork-lightbox" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setArtworkOpen(false);
        }}>
          <figure role="dialog" aria-modal="true" aria-label={`Artwork: ${card.name}`}>
            <img src={artwork} alt={`Artwork der Karte ${card.name}`} />
            <figcaption>
              <span>{domainLabels[card.domain]} · {card.type}</span>
              <h2>{card.name}</h2>
            </figcaption>
            <button type="button" onClick={() => setArtworkOpen(false)} aria-label="Artwork schließen">×</button>
          </figure>
        </div>,
        document.body,
      )}
    </aside>
  );
}
