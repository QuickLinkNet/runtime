import { cardById } from '../../../game/catalog';
import type { GameEvent, PlayerView } from '../../../game/types';

export type EventTone = 'neutral' | 'action' | 'positive' | 'danger';

export interface EventPresentation {
  label: string;
  detail?: string;
  tone: EventTone;
}

const fallbackLabels: Record<string, string> = {
  MULLIGAN_STARTED: 'Startkarten werden gewählt',
  MULLIGAN_COMPLETED: 'Startkarten bestätigt',
  CARD_DRAWN: 'Karte gezogen',
  CARD_OVERFLOW: 'Hand voll – Karte verworfen',
  CARD_GENERATED: 'Karte erzeugt',
  CARD_PLAYED: 'Karte ausgespielt',
  SERVICE_DEPLOYED: 'Service bereitgestellt',
  ATTACK_STARTED: 'Angriff gestartet',
  DAMAGE_DEALT: 'Schaden verursacht',
  SERVICE_CRASHED: 'Service abgestürzt',
  INFRASTRUCTURE_DESTROYED: 'Infrastructure zerstört',
  INFRASTRUCTURE_REPLACED: 'Infrastructure ersetzt',
  REDUNDANCY_TRIGGERED: 'Redundancy ausgelöst',
  SERVICE_SANDBOXED: 'Service isoliert',
  SERVICE_FORKED: 'Service kopiert',
  TOKEN_CREATED: 'Token erzeugt',
  BUG_CREATED: 'BUG erzeugt',
  BUG_DEBUGGED: 'BUG entfernt',
  TURN_STARTED: 'Neuer Zug',
  TURN_ENDED: 'Zug beendet',
  TURN_TIMEOUT: 'Zeit abgelaufen',
  MEMORY_LEAK: 'Memory Leak',
  PATCH_APPLIED: 'Patch angewendet',
  FRIDAY_DEPLOY_RESOLVED: 'Friday Deploy ausgeführt',
  GAME_OVER: 'Match beendet',
};

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
  const base = fallbackLabels[event.type] ?? event.type.replaceAll('_', ' ').toLowerCase();

  if (event.type === 'CARD_PLAYED' && cardName) {
    return { label: cardName, detail: `${playerName ?? 'Spieler'} · ${event.cost ?? '?'} Compute`, tone: 'action' };
  }
  if (event.type === 'DAMAGE_DEALT' && amount !== undefined) {
    return { label: `${amount} Schaden`, detail: 'Treffer bestätigt', tone: 'danger' };
  }
  if (event.type === 'PATCH_APPLIED' && amount !== undefined) {
    return { label: `Patch +${amount}`, detail: 'Integrity wiederhergestellt', tone: 'positive' };
  }
  if (event.type === 'MEMORY_LEAK' && amount !== undefined) {
    return { label: `Memory Leak −${amount}`, detail: playerName, tone: 'danger' };
  }
  if (event.type === 'TURN_STARTED') {
    return { label: `Zug ${event.turn ?? ''}`.trim(), detail: playerName, tone: 'neutral' };
  }

  return { label: base, detail: playerName, tone: toneFor(event.type) };
}
