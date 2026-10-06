import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { cardById } from '../../../game/catalog';
import type { CardInstance, GameState } from '../../../game/types';
import { GameCard } from '../../cards';

interface CombatRect {
  left: number;
  top: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

interface EntityMeta {
  definitionId: string;
}

type CombatEffect =
  | { id: string; kind: 'attack'; source: CombatRect; target: CombatRect; definitionId?: string; delay: number }
  | { id: string; kind: 'impact'; target: CombatRect; label: string; blocked?: boolean; delay: number }
  | { id: string; kind: 'destroy'; source: CombatRect; destination: CombatRect; definitionId?: string; token: boolean; delay: number };

function rectFor(element: Element): CombatRect {
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    centerX: rect.left + (rect.width / 2),
    centerY: rect.top + (rect.height / 2),
  };
}

function animationStyle(delay: number): CSSProperties {
  return { '--combat-delay': `${delay}ms` } as CSSProperties;
}

export function CombatFeedbackLayer({ state, animationScale }: { state: GameState; animationScale: number }) {
  const seenEventIdsRef = useRef(new Set(state.events.map((event) => event.id)));
  const positionsRef = useRef(new Map<string, CombatRect>());
  const entitiesRef = useRef(new Map<string, EntityMeta>());
  const trashRef = useRef(new Map<string, CombatRect>());
  const timersRef = useRef<number[]>([]);
  const [effects, setEffects] = useState<CombatEffect[]>([]);

  useLayoutEffect(() => {
    const newEvents = state.events.filter((event) => !seenEventIdsRef.current.has(event.id));
    const created: CombatEffect[] = [];
    let attackDelay = 0;

    for (const event of newEvents) {
      if (event.type === 'ATTACK_STARTED' && event.attackerId && event.targetId) {
        const source = positionsRef.current.get(event.attackerId);
        const target = positionsRef.current.get(event.targetId);
        const meta = entitiesRef.current.get(event.attackerId);
        if (source && target) {
          created.push({ id: `attack-${event.id}`, kind: 'attack', source, target, definitionId: meta?.definitionId, delay: attackDelay });
        }
        attackDelay += 820 * animationScale;
        continue;
      }

      if (event.type === 'DAMAGE_DEALT' && event.targetId) {
        const target = positionsRef.current.get(event.targetId);
        if (target) created.push({ id: `impact-${event.id}`, kind: 'impact', target, label: `-${event.amount ?? 0}`, delay: Math.max(0, attackDelay - (560 * animationScale)) });
        continue;
      }

      if (event.type === 'REDUNDANCY_TRIGGERED' && event.targetId) {
        const target = positionsRef.current.get(event.targetId);
        if (target) created.push({ id: `block-${event.id}`, kind: 'impact', target, label: 'BLOCK', blocked: true, delay: Math.max(0, attackDelay - (560 * animationScale)) });
        continue;
      }

      if ((event.type === 'SERVICE_CRASHED' || event.type === 'INFRASTRUCTURE_DESTROYED') && event.entityId && event.playerId) {
        const source = positionsRef.current.get(event.entityId);
        const meta = entitiesRef.current.get(event.entityId);
        const definition = meta ? cardById.get(meta.definitionId) : undefined;
        const trash = trashRef.current.get(event.playerId);
        if (source) {
          const fallback = { ...source, centerY: source.centerY + 140, top: source.top + 140 };
          created.push({
            id: `destroy-${event.id}`,
            kind: 'destroy',
            source,
            destination: definition?.token || !trash ? fallback : trash,
            definitionId: meta?.definitionId,
            token: Boolean(definition?.token),
            delay: Math.max(420 * animationScale, attackDelay - (260 * animationScale)),
          });
        }
      }
    }

    seenEventIdsRef.current = new Set(state.events.map((event) => event.id));
    if (created.length > 0) {
      setEffects((current) => [...current.slice(-12), ...created]);
      for (const effect of created) {
        const timer = window.setTimeout(() => {
          setEffects((current) => current.filter((item) => item.id !== effect.id));
        }, (1900 * animationScale) + effect.delay);
        timersRef.current.push(timer);
      }
    }

    document.querySelectorAll<HTMLElement>('[data-combat-id]').forEach((element) => {
      const id = element.dataset.combatId;
      if (id) positionsRef.current.set(id, rectFor(element));
    });
    document.querySelectorAll<HTMLElement>('[data-combat-trash]').forEach((element) => {
      const playerId = element.dataset.combatTrash;
      if (playerId) trashRef.current.set(playerId, rectFor(element));
    });
    for (const player of Object.values(state.players)) {
      for (const entity of [...player.services, ...player.infrastructure]) {
        entitiesRef.current.set(entity.instanceId, { definitionId: entity.definitionId });
      }
    }
  }, [animationScale, state]);

  useLayoutEffect(() => () => {
    for (const timer of timersRef.current) window.clearTimeout(timer);
  }, []);

  if (effects.length === 0) return null;

  return createPortal(
    <div className="combat-effect-layer" aria-hidden="true" style={{ '--motion-scale': animationScale } as CSSProperties}>
      {effects.map((effect) => {
        if (effect.kind === 'impact') {
          return (
            <div
              className={`combat-impact ${effect.blocked ? 'is-blocked' : ''}`}
              key={effect.id}
              style={{ left: effect.target.centerX, top: effect.target.centerY, ...animationStyle(effect.delay) }}
            >
              <i />
              <b>{effect.label}</b>
            </div>
          );
        }

        const destination = effect.kind === 'attack' ? effect.target : effect.destination;
        const dx = destination.centerX - effect.source.centerX;
        const dy = destination.centerY - effect.source.centerY;
        const style = {
          left: effect.source.left,
          top: effect.source.top,
          width: effect.source.width,
          height: effect.source.height,
          '--combat-x': `${dx}px`,
          '--combat-y': `${dy}px`,
          ...animationStyle(effect.delay),
        } as CSSProperties;
        const card: CardInstance | undefined = effect.definitionId ? {
          instanceId: `feedback-${effect.id}`,
          definitionId: effect.definitionId,
        } : undefined;

        if (effect.kind === 'destroy') {
          return (
            <div className={`combat-destroy-ghost ${effect.token ? 'is-token' : ''}`} key={effect.id} style={style}>
              {card && <GameCard card={card} compact detailsOnHover={false} />}
              <i />
            </div>
          );
        }

        const distance = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <div className="combat-attack-group" key={effect.id}>
            <div
              className="combat-trace"
              style={{ left: effect.source.centerX, top: effect.source.centerY, width: distance, transform: `rotate(${angle}deg)`, '--combat-length': `${distance}px`, ...animationStyle(effect.delay) } as CSSProperties}
            />
            {card && (
              <div className="combat-attacker-ghost" style={style}>
                <GameCard card={card} compact detailsOnHover={false} />
              </div>
            )}
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
