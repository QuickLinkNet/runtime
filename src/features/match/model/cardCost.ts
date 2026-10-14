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
  let projectManagerDiscount = 0;
  let nextServiceDiscount = 0;
  for (const played of playedDefinitions) {
    if (played.type === 'command') projectManagerDiscount = 0;
    if (played.type === 'service') nextServiceDiscount = 0;
    if (played.id === 'neutral-project-manager') projectManagerDiscount = 2;
    if (played.id === 'neutral-scrum-master') nextServiceDiscount = 1;
  }

  let cost = definition.cost;
  if (definition.id === 'ai-gpu-cluster') {
    const aiServices = player.services.filter((entity) => cardById.get(entity.definitionId)?.domain === 'ai').length;
    cost = Math.max(4, cost - aiServices);
  }
  if (card.costModifierUntilPlayed || card.costModifierTurn === state.turn) cost += card.costModifier ?? 0;
  if (definition.type === 'service' && !servicePlayed && opponent?.services.some((entity) => (
    entity.definitionId === 'security-rate-limiter' && !entity.sandboxed
  ))) cost += 1;
  if (definition.type === 'service' && definition.domain === 'frontend' && !frontendPlayed) {
    cost = Math.max(1, cost - (hasInfrastructure(player, 'frontend-state-store') ? 1 : 0));
  }
  if (definition.domain === 'data' && !playedDefinitions.some((played) => played.domain === 'data') && hasInfrastructure(player, 'ai-rag-pipeline')) cost = Math.max(1, cost - 1);
  if (definition.type === 'service' && definition.domain === 'ai' && hasInfrastructure(player, 'ai-gpu-cluster')) cost -= 1;
  if (definition.type === 'command' && !commandPlayed && hasInfrastructure(player, 'neutral-ci-pipeline')) cost -= 1;
  if (definition.type === 'command') cost -= projectManagerDiscount;
  if (definition.type === 'service') cost -= nextServiceDiscount;
  if (state.incident?.rule === 'FIRST_SERVICE_PLUS_ONE' && definition.type === 'service' && !servicePlayed) cost += 1;
  if (state.incident?.rule === 'FIRST_COMMAND_MINUS_ONE' && definition.type === 'command' && !commandPlayed) cost -= 1;
  if (state.incident?.rule === 'FIRST_DATA_AI_SERVICE_MINUS_ONE' && definition.type === 'service' && ['data', 'ai'].includes(definition.domain) && !servicePlayed) cost -= 1;
  return Math.max(0, cost);
}
