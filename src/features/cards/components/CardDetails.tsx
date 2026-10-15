import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { definitionsForCard } from '../../../game/keywordDefinitions';
import { rarityForCard } from '../../../game/cardRarity';
import type { BoardEntity, CardDefinition } from '../../../game/types';
import { Button } from '../../../ui/atoms';
import { KeywordText } from './KeywordText';
import { useI18n } from '../../../i18n';

interface PanelProps {
  definition: CardDefinition;
  entity?: BoardEntity | null;
  compact?: boolean;
}

export function CardDetailPanel({ definition, entity, compact = false }: PanelProps) {
  const { t } = useI18n();
  const explanations = definitionsForCard(definition);
  const rarity = rarityForCard(definition.id);
  return (
    <article className={`card-detail-panel domain-${definition.domain} ${compact ? 'compact' : ''}`}>
      <header>
        <div>
          <span className="card-detail-domain">{t(`domain.${definition.domain}`)} · {t(`type.${definition.type}`)}{rarity ? ` · ${t(`rarity.${rarity}`)}` : ''}</span>
          <h2>{definition.name}</h2>
        </div>
        <span className="card-detail-cost"><b>{definition.cost}</b> Compute</span>
      </header>
      {(definition.power !== undefined || definition.integrity !== undefined) && (
        <div className="card-detail-stats">
          {definition.power !== undefined && <span><small>{t('common.power')}</small><b>{entity?.power ?? definition.power}</b></span>}
          {definition.integrity !== undefined && <span><small>{t('common.integrity')}</small><b>{entity ? `${entity.integrity}/${entity.maxIntegrity}` : definition.integrity}</b></span>}
        </div>
      )}
      <div className="card-detail-text"><KeywordText text={definition.text} /></div>
      {explanations.length > 0 && (
        <section className="card-explanations">
          <h3>{t('card.effects')}</h3>
          <div>
            {explanations.map((explanation) => (
              <article key={explanation.id}>
                <b>{t(`keyword.${explanation.id}.label`)}</b>
                <p>{t(`keyword.${explanation.id}.full`)}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

interface ModalProps extends PanelProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
}

export function CardDetailModal({ open, onClose, onConfirm, confirmLabel, ...panelProps }: ModalProps) {
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="modal-backdrop card-detail-modal" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <div className="modal-shell" role="dialog" aria-modal="true" aria-label={t('card.detailsFor', { name: panelProps.definition.name })}>
        <button className="modal-close" type="button" onClick={onClose} aria-label={t('card.closeDetails')}>×</button>
        <CardDetailPanel {...panelProps} />
        <footer className="modal-actions">
          <Button variant="ghost" onClick={onClose}>{t('common.close')}</Button>
          {onConfirm && <Button variant="primary" onClick={() => { onClose(); onConfirm(); }}>{confirmLabel ?? t('card.select')}</Button>}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
