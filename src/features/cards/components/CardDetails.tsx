import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { domainLabels } from '../../../game/catalog';
import { definitionsForCard } from '../../../game/keywordDefinitions';
import type { BoardEntity, CardDefinition } from '../../../game/types';
import { Button } from '../../../ui/atoms';
import { KeywordText } from './KeywordText';

interface PanelProps {
  definition: CardDefinition;
  entity?: BoardEntity | null;
  compact?: boolean;
}

export function CardDetailPanel({ definition, entity, compact = false }: PanelProps) {
  const explanations = definitionsForCard(definition);
  return (
    <article className={`card-detail-panel domain-${definition.domain} ${compact ? 'compact' : ''}`}>
      <header>
        <div>
          <span className="card-detail-domain">{domainLabels[definition.domain]} · {definition.type}</span>
          <h2>{definition.name}</h2>
        </div>
        <span className="card-detail-cost"><b>{definition.cost}</b> Compute</span>
      </header>
      {(definition.power !== undefined || definition.integrity !== undefined) && (
        <div className="card-detail-stats">
          {definition.power !== undefined && <span><small>Power</small><b>{entity?.power ?? definition.power}</b></span>}
          {definition.integrity !== undefined && <span><small>Integrity</small><b>{entity ? `${entity.integrity}/${entity.maxIntegrity}` : definition.integrity}</b></span>}
        </div>
      )}
      <div className="card-detail-text"><KeywordText text={definition.text} /></div>
      <section className="card-explanations">
        <h3>Erklärungen</h3>
        <div>
          {explanations.map((explanation) => (
            <article key={explanation.id}>
              <b>{explanation.label}</b>
              <p>{explanation.fullDescription}</p>
            </article>
          ))}
        </div>
      </section>
    </article>
  );
}

interface ModalProps extends PanelProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
}

export function CardDetailModal({ open, onClose, onConfirm, confirmLabel = 'Karte auswählen', ...panelProps }: ModalProps) {
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
      <div className="modal-shell" role="dialog" aria-modal="true" aria-label={`Details zu ${panelProps.definition.name}`}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Kartendetails schließen">×</button>
        <CardDetailPanel {...panelProps} />
        <footer className="modal-actions">
          <Button variant="ghost" onClick={onClose}>Schließen</Button>
          {onConfirm && <Button variant="primary" onClick={() => { onClose(); onConfirm(); }}>{confirmLabel}</Button>}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
