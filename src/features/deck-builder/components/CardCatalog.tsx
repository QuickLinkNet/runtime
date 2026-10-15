import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CardDefinition, CardInstance } from '../../../game/types';
import { GameCard } from '../../cards';
import { maxCopiesFor } from '../model/deckBuilder';
import { useI18n } from '../../../i18n';

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
  const { t } = useI18n();
  const [inspectedCardId, setInspectedCardId] = useState<string | null>(null);
  const inspectedIndex = cards.findIndex((card) => card.id === inspectedCardId);
  const inspectedCard = inspectedIndex >= 0 ? cards[inspectedIndex] : null;

  if (selectedDomainCount === 0 && !showingNeutral) {
    return (
      <section className="catalog-grid" aria-label={t('deck.catalog.aria')}>
        <div className="catalog-empty"><b>{t('deck.catalog.chooseDomains')}</b><span>{t('deck.catalog.chooseDomainsHelp')}</span></div>
      </section>
    );
  }

  if (cards.length === 0) {
    return (
      <section className="catalog-grid" aria-label={t('deck.catalog.aria')}>
        <div className="catalog-empty"><b>{t('deck.catalog.empty')}</b><span>{t('deck.catalog.emptyHelp')}</span></div>
      </section>
    );
  }

  return (
    <>
      <section className={`catalog-grid columns-${columns}`} aria-label={t('deck.catalog.aria')}>
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
              actionLabel={t('deck.catalog.openLarge')}
              onClick={() => setInspectedCardId(card.id)}
            />
            <footer className="catalog-card-actions">
              <span>{t('deck.catalog.inDeck')} <b>{copies}/{maxCopiesFor(card)}</b>{owned && <> · {t('deck.catalog.owned')} <b>{owned[card.id] ?? 0}</b></>}</span>
              <span className="copy-stepper">
                <button type="button" disabled={copies === 0} onClick={() => onRemove(card.id)} aria-label={t('deck.catalog.remove', { name: card.name })}>−</button>
                <button type="button" disabled={!canAdd} onClick={() => onAdd(card.id)} aria-label={t('deck.catalog.add', { name: card.name })}>+</button>
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
  const { t } = useI18n();
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
      <div className="catalog-lightbox-dialog" role="dialog" aria-modal="true" aria-label={t('deck.lightbox.aria', { name: card.name })}>
        <button className="catalog-lightbox-close" type="button" onClick={onClose} aria-label={t('deck.lightbox.close')}>×</button>
        <button className="catalog-lightbox-nav previous" type="button" onClick={onPrevious} disabled={!hasPrevious} aria-label={t('deck.lightbox.previous')}>‹</button>
        <div className="catalog-lightbox-card"><GameCard card={previewCard} detailsOnHover={false} detailsOnTap={false} /></div>
        <button className="catalog-lightbox-nav next" type="button" onClick={onNext} disabled={!hasNext} aria-label={t('deck.lightbox.next')}>›</button>
        <p><b>{card.name}</b><span>{t('deck.lightbox.help')}</span></p>
      </div>
    </div>,
    document.body,
  );
}
