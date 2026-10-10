import { cardById } from '../../../game/catalog';
import type { CardDefinition, CardInstance, GameEvent, GameState, PlayerView } from '../../../game/types';

function eventsInCurrentTurn(state: GameState): GameEvent[] {
  let startIndex = -1;
  for (let index = state.events.length - 1; index >= 0; index -= 1) {
    const event = state.events[index];
    if (event.type === 'TURN_STARTED' && event.turn === state.turn && event.playerId === state.viewerId) {
      startIndex = index;
      break;
    }
  }
  return startIndex < 0 ? [] : state.events.slice(startIndex);
}

function hasInfrastructure(player: PlayerView, definitionId: string) {
  return player.infrastructure.some((entity) => entity.definitionId === definitionId);
}

function countInfrastructure(player: PlayerView, definitionId: string) {
  return player.infrastructure.filter((entity) => entity.definitionId === definitionId).length;
}

export function knownCardCost(state: GameState, card: CardInstance, definition: CardDefinition): number {
  const player = state.players[state.viewerId];
  const opponentId = state.order.find((id) => id !== state.viewerId);
  const opponent = opponentId ? state.players[opponentId] : undefined;
  const turnEvents = eventsInCurrentTurn(state);
  const playedDefinitions = turnEvents
    .filter((event) => event.type === 'CARD_PLAYED' && event.playerId === state.viewerId)
    .map((event) => event.definitionId ? cardById.get(event.definitionId) : undefined)
    .filter((played): played is CardDefinition => Boolean(played));

  const servicePlayed = playedDefinitions.some((played) => played.type === 'service');
  const frontendPlayed = playedDefinitions.some((played) => played.type === 'service' && played.domain === 'frontend');
  const commandPlayed = playedDefinitions.some((played) => played.type === 'command');
  let projectManagerDiscount = false;
  for (const played of playedDefinitions) {
    if (played.id === 'neutral-project-manager') projectManagerDiscount = true;
    if (played.type === 'command') projectManagerDiscount = false;
  }

  let cost = definition.cost;
  if (card.costModifierTurn === state.turn) cost += card.costModifier ?? 0;
  if (definition.type === 'service' && !servicePlayed && opponent?.services.some((entity) => (
    entity.definitionId === 'security-rate-limiter' && !entity.sandboxed
  ))) cost += 1;
  if (definition.type === 'service' && definition.domain === 'frontend' && !frontendPlayed) {
    cost = Math.max(1, cost - countInfrastructure(player, 'frontend-state-store'));
  }
  if (definition.type === 'service' && definition.domain === 'ai' && hasInfrastructure(player, 'ai-gpu-cluster')) cost -= 1;
  if (definition.type === 'command' && !commandPlayed && hasInfrastructure(player, 'neutral-ci-pipeline')) cost -= 1;
  if (definition.type === 'command' && projectManagerDiscount) cost -= 1;
  if (state.incident?.rule === 'FIRST_SERVICE_PLUS_ONE' && definition.type === 'service' && !servicePlayed) cost += 1;
  if (state.incident?.rule === 'FIRST_COMMAND_MINUS_ONE' && definition.type === 'command' && !commandPlayed) cost -= 1;
  if (state.incident?.rule === 'FIRST_DATA_AI_SERVICE_MINUS_ONE' && definition.type === 'service' && ['data', 'ai'].includes(definition.domain) && !servicePlayed) cost -= 1;
  return Math.max(0, cost);
}
