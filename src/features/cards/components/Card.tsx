import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { cardById, domainLabels } from '../../../game/catalog';
import type { BoardEntity, CardInstance } from '../../../game/types';
import { CardDetailModal, CardDetailPanel } from './CardDetails';
import { KeywordText } from './KeywordText';

interface Props {
  card: CardInstance | BoardEntity;
  selected?: boolean;
  playable?: boolean;
  targetable?: boolean;
  compact?: boolean;
  actionLabel?: string;
  onClick?: () => void;
}

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(hover: none), (pointer: coarse)');
    const update = () => setCoarse(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return coarse;
}

export function GameCard({ card, selected, playable, targetable, compact, actionLabel, onClick }: Props) {
  const definition = cardById.get(card.definitionId);
  const entity = 'integrity' in card ? card : null;
  const isCoarsePointer = useCoarsePointer();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [hoverStyle, setHoverStyle] = useState<CSSProperties | null>(null);

  if (!definition) return null;

  const classes = [
    'game-card', `domain-${definition.domain}`,
    selected ? 'is-selected' : '', playable ? 'is-playable' : '',
    targetable ? 'is-targetable' : '', compact ? 'is-compact' : '',
    entity?.exhausted ? 'is-exhausted' : '', entity?.sandboxed ? 'is-sandboxed' : '',
  ].filter(Boolean).join(' ');

  function clearCloseTimer() {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function showHoverPreview() {
    if (isCoarsePointer || !buttonRef.current) return;
    clearCloseTimer();
    const rect = buttonRef.current.getBoundingClientRect();
    const previewWidth = 390;
    const gap = 14;
    const left = rect.right + gap + previewWidth <= window.innerWidth
      ? rect.right + gap
      : Math.max(12, rect.left - previewWidth - gap);
    const top = Math.max(12, Math.min(rect.top - 70, window.innerHeight - 620));
    setHoverStyle({ left, top });
  }

  function scheduleHidePreview() {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => setHoverStyle(null), 120);
  }

  function handleCardClick() {
    if (isCoarsePointer) {
      setDetailsOpen(true);
      return;
    }
    onClick?.();
  }

  return (
    <>
      <button
        ref={buttonRef}
        className={classes}
        onClick={handleCardClick}
        onMouseEnter={showHoverPreview}
        onMouseLeave={scheduleHidePreview}
        onFocus={showHoverPreview}
        onBlur={scheduleHidePreview}
        type="button"
        aria-pressed={selected}
        aria-label={`${definition.name}. ${isCoarsePointer ? 'Antippen für Details.' : 'Details beim Darüberfahren.'}`}
      >
        <span className="card-topline">
          <span className="card-cost" aria-label={`${definition.cost} Compute`}>{definition.cost}</span>
          <span className="card-domain">{domainLabels[definition.domain]}</span>
        </span>
        <strong className="card-name">{definition.name}</strong>
        <span className="card-type">{definition.type}</span>
        <span className="card-text"><KeywordText text={definition.text} /></span>
        {entity?.redundancy && <span className="card-status">REDUNDANCY</span>}
        {entity?.sandboxed && <span className="card-status">SANDBOX</span>}
        {(definition.type === 'service' || definition.type === 'infrastructure') && (
          <span className="card-stats">
            {definition.type === 'service' && <span title="Power">{entity?.power ?? definition.power} ◆</span>}
            <span title="Integrity">{entity ? `${entity.integrity}/${entity.maxIntegrity}` : definition.integrity} ♥</span>
          </span>
        )}
        <span className="card-detail-hint">{isCoarsePointer ? 'Tippen: Details' : 'Hover: Details'}</span>
      </button>

      {hoverStyle && createPortal(
        <div
          className="card-hover-preview"
          style={hoverStyle}
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleHidePreview}
        >
          <CardDetailPanel definition={definition} entity={entity} compact />
        </div>,
        document.body,
      )}

      <CardDetailModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onConfirm={onClick}
        confirmLabel={actionLabel}
        definition={definition}
        entity={entity}
      />
    </>
  );
}
