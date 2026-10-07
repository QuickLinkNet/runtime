import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { cardById, domainLabels } from '../../../game/catalog';
import { cardArtworkById } from '../../../game/cardArtwork';
import { rarityForCard } from '../../../game/cardRarity';
import type { BoardEntity, CardInstance } from '../../../game/types';
import { useValuePulse } from '../../../ui/hooks/useValuePulse';
import { CardDetailModal, CardDetailPanel } from './CardDetails';
import { KeywordText } from './KeywordText';

interface Props {
  card: CardInstance | BoardEntity;
  selected?: boolean;
  playable?: boolean;
  targetable?: boolean;
  compact?: boolean;
  detailsOnHover?: boolean;
  detailsOnTap?: boolean;
  style?: CSSProperties;
  actionLabel?: string;
  combatId?: string;
  displayCost?: number;
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

export function GameCard({ card, selected, playable, targetable, compact, detailsOnHover = true, detailsOnTap = false, style, actionLabel, combatId, displayCost, onClick }: Props) {
  const definition = cardById.get(card.definitionId);
  const entity = 'integrity' in card ? card : null;
  const integrityPulse = useValuePulse(entity?.integrity);
  const isCoarsePointer = useCoarsePointer();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [hoverStyle, setHoverStyle] = useState<CSSProperties | null>(null);

  useEffect(() => {
    if (!detailsOpen || !detailsOnTap) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetailsOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [detailsOpen, detailsOnTap]);

  if (!definition) return null;

  const visualType = definition.token ? 'token' : definition.type;
  const rarity = rarityForCard(definition.id);
  const artwork = cardArtworkById[definition.id];
  const shownCost = displayCost ?? definition.cost;

  const classes = [
    'game-card', `domain-${definition.domain}`,
    rarity ? `card-rarity-${rarity}` : '',
    `type-${visualType}`,
    selected ? 'is-selected' : '', playable ? 'is-playable' : '',
    targetable ? 'is-targetable' : '', compact ? 'is-compact' : '',
    integrityPulse ? `is-${integrityPulse}` : '',
    entity?.exhausted ? 'is-exhausted' : '', entity?.sandboxed ? 'is-sandboxed' : '',
  ].filter(Boolean).join(' ');

  function clearCloseTimer() {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function showHoverPreview() {
    if (!detailsOnHover || isCoarsePointer || !buttonRef.current) return;
    clearCloseTimer();
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportMargin = 12;
    const previewWidth = Math.min(390, window.innerWidth - (viewportMargin * 2));
    const previewHeight = Math.min(620, window.innerHeight - (viewportMargin * 2));
    const gap = 14;
    const left = rect.right + gap + previewWidth <= window.innerWidth
      ? rect.right + gap
      : Math.max(viewportMargin, rect.left - previewWidth - gap);
    const top = Math.max(
      viewportMargin,
      Math.min(rect.top - 70, window.innerHeight - previewHeight - viewportMargin),
    );
    setHoverStyle({
      left,
      top,
      width: previewWidth,
      maxHeight: window.innerHeight - top - viewportMargin,
    });
  }

  function scheduleHidePreview() {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => setHoverStyle(null), 120);
  }

  function handleCardClick() {
    if (isCoarsePointer && detailsOnTap) {
      setDetailsOpen(true);
      return;
    }
    if (onClick) {
      setHoverStyle(null);
      onClick();
      return;
    }
    if (isCoarsePointer) setDetailsOpen(true);
  }

  return (
    <>
      <button
        ref={buttonRef}
        className={classes}
        data-combat-id={combatId}
        style={style}
        onClick={handleCardClick}
        onMouseEnter={detailsOnHover ? showHoverPreview : undefined}
        onMouseLeave={detailsOnHover ? scheduleHidePreview : undefined}
        onFocus={detailsOnHover && !onClick ? showHoverPreview : undefined}
        onBlur={detailsOnHover ? scheduleHidePreview : undefined}
        type="button"
        aria-pressed={selected}
        aria-label={`${definition.name}${rarity ? `, ${rarity}` : ''}. ${isCoarsePointer && detailsOnTap ? 'Antippen für Details.' : `${actionLabel ? `${actionLabel}. ` : ''}${detailsOnHover && !isCoarsePointer ? 'Details beim Darüberfahren.' : 'Karte anzeigen.'}`}`}
      >
        {artwork && <span className="card-artwork" style={{ backgroundImage: `url(${artwork})` }} aria-hidden="true" />}
        <span className={`card-cost ${shownCost < definition.cost ? 'is-discounted' : ''} ${shownCost > definition.cost ? 'is-increased' : ''}`} aria-label={`${shownCost} Compute`}>{shownCost}</span>
        <strong className="card-name">{definition.name}</strong>
        <span className="card-classification">
          <span className={`card-type-badge type-${visualType}`} aria-hidden="true" />
          <span className="card-classification-label">
            <span className="card-domain">{domainLabels[definition.domain]}</span>
            <i aria-hidden="true">·</i>
            <span className="card-type">{visualType}</span>
          </span>
        </span>
        <span className="card-text"><KeywordText text={definition.text} /></span>
        {entity?.redundancy && <span className="card-status">REDUNDANCY</span>}
        {entity?.sandboxed && <span className="card-status">SANDBOX</span>}
        {(definition.type === 'service' || definition.type === 'infrastructure') && (
          <span className="card-stats">
            {definition.type === 'service' && (
              <span className="card-stat card-stat-power" title="Power">
                <b>{entity?.power ?? definition.power}</b>
                <small>Power</small>
              </span>
            )}
            <span className="card-stat card-stat-integrity" title="Integrity">
              <b>{entity ? `${entity.integrity}/${entity.maxIntegrity}` : `${definition.integrity}/${definition.integrity}`}</b>
              <small>Integrity</small>
            </span>
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

      {detailsOpen && detailsOnTap && createPortal(
        <div className="card-visual-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setDetailsOpen(false);
        }}>
          <div className="card-visual-dialog" role="dialog" aria-modal="true" aria-label={`Kartenansicht: ${definition.name}`}>
            <button className="card-visual-close" type="button" onClick={() => setDetailsOpen(false)} aria-label="Kartenansicht schließen">×</button>
            <div className="card-visual-stage">
              <GameCard card={card} detailsOnHover={false} onClick={() => undefined} />
            </div>
          </div>
        </div>,
        document.body,
      )}

      <CardDetailModal
        open={detailsOpen && !detailsOnTap}
        onClose={() => setDetailsOpen(false)}
        onConfirm={detailsOnTap ? undefined : onClick}
        confirmLabel={actionLabel}
        definition={definition}
        entity={entity}
      />
    </>
  );
}
