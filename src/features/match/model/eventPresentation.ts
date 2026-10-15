import { cardById } from '../../../game/catalog';
import type { GameEvent, PlayerView } from '../../../game/types';
import { t } from '../../../i18n';

export type EventTone = 'neutral' | 'action' | 'positive' | 'danger';

export interface EventPresentation {
  label: string;
  detail?: string;
  tone: EventTone;
}

const knownEventTypes = new Set([
  'MULLIGAN_STARTED', 'MULLIGAN_COMPLETED', 'CARD_DRAWN', 'CARD_OVERFLOW', 'CARD_GENERATED',
  'CARD_PLAYED', 'SERVICE_DEPLOYED', 'ATTACK_STARTED', 'DAMAGE_DEALT', 'SERVICE_CRASHED',
  'INFRASTRUCTURE_DESTROYED', 'INFRASTRUCTURE_REPLACED', 'INFRASTRUCTURE_DECOMMISSIONED',
  'REDUNDANCY_TRIGGERED', 'SERVICE_SANDBOXED', 'SERVICE_FORKED', 'TOKEN_CREATED', 'BUG_CREATED',
  'BUG_DEBUGGED', 'BUGS_CLEANED_FOR_DEPLOY', 'TURN_STARTED', 'TURN_ENDED', 'TURN_TIMEOUT', 'MEMORY_LEAK', 'PATCH_APPLIED',
  'FRIDAY_DEPLOY_RESOLVED', 'GAME_OVER',
]);

function toneFor(type: string): EventTone {
  if (['DAMAGE_DEALT', 'SERVICE_CRASHED', 'INFRASTRUCTURE_DESTROYED', 'MEMORY_LEAK', 'TURN_TIMEOUT', 'CARD_OVERFLOW'].includes(type)) return 'danger';
  if (['PATCH_APPLIED', 'REDUNDANCY_TRIGGERED', 'SERVICE_FORKED', 'BUG_DEBUGGED'].includes(type)) return 'positive';
  if (['CARD_PLAYED', 'ATTACK_STARTED', 'SERVICE_DEPLOYED', 'SERVICE_SANDBOXED'].includes(type)) return 'action';
  return 'neutral';
}

export function presentEvent(event: GameEvent, players: Record<string, PlayerView>): EventPresentation {
  const playerName = event.playerId ? players[event.playerId]?.name : undefined;
  const cardName = event.definitionId ? cardById.get(event.definitionId)?.name : undefined;
  const amount = event.amount ?? event.prevented;
  const base = knownEventTypes.has(event.type) ? t(`match.event.${event.type}`) : event.type.replaceAll('_', ' ').toLowerCase();

  if (event.type === 'CARD_PLAYED' && cardName) {
    return { label: cardName, detail: t('match.event.playedDetail', { player: playerName ?? t('match.event.player'), cost: event.cost ?? '?' }), tone: 'action' };
  }
  if (event.type === 'DAMAGE_DEALT' && amount !== undefined) {
    return { label: t('match.event.damage', { amount }), detail: t('match.event.hitConfirmed'), tone: 'danger' };
  }
  if (event.type === 'PATCH_APPLIED' && amount !== undefined) {
    return { label: t('match.event.patch', { amount }), detail: t('match.event.integrityRestored'), tone: 'positive' };
  }
  if (event.type === 'MEMORY_LEAK' && amount !== undefined) {
    return { label: t('match.event.memoryLeak', { amount }), detail: playerName, tone: 'danger' };
  }
  if (event.type === 'TURN_STARTED') {
    return { label: t('match.event.turn', { turn: event.turn ?? '' }).trim(), detail: playerName, tone: 'neutral' };
  }

  return { label: base, detail: playerName, tone: toneFor(event.type) };
}
