import { useEffect, useRef } from 'react';
import { playSfx } from '../../../audio/sfx';
import type { GameState, PlayerView } from '../../../game/types';

function entities(player: PlayerView) {
  return [...player.services, ...player.infrastructure];
}

function entityMap(player: PlayerView) {
  return new Map(entities(player).map((entity) => [entity.instanceId, entity]));
}

function integrityChange(previous: PlayerView, current: PlayerView) {
  const before = entityMap(previous);
  let damaged = false;
  let healed = false;
  for (const entity of entities(current)) {
    const old = before.get(entity.instanceId);
    if (!old) continue;
    damaged ||= entity.integrity < old.integrity;
    healed ||= entity.integrity > old.integrity;
  }
  return { damaged, healed };
}

export function useMatchSounds(state: GameState) {
  const previousRef = useRef<GameState | null>(null);

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = state;
    if (!previous) return;

    if (state.status === 'finished' && previous.status !== 'finished') {
      playSfx(state.winnerId === state.viewerId ? 'victory' : 'defeat');
      return;
    }

    const previousViewer = previous.players[state.viewerId];
    const viewer = state.players[state.viewerId];
    if (!previousViewer || !viewer) return;

    const coreWasDamaged = Object.values(state.players).some((player) => {
      const old = previous.players[player.id];
      return old && player.core < old.core;
    });
    if (coreWasDamaged) {
      playSfx('core-damage');
      return;
    }

    const cardCrashed = Object.values(state.players).some((player) => {
      const old = previous.players[player.id];
      if (!old || player.trashCount <= old.trashCount) return false;
      const remainingIds = new Set(entities(player).map((entity) => entity.instanceId));
      return entities(old).some((entity) => !remainingIds.has(entity.instanceId));
    });
    if (cardCrashed) {
      playSfx('card-crash');
      return;
    }

    const changes = Object.values(state.players).map((player) => {
      const old = previous.players[player.id];
      return old ? integrityChange(old, player) : { damaged: false, healed: false };
    });
    if (changes.some((change) => change.damaged)) playSfx('damage-hit');
    else if (changes.some((change) => change.healed)) playSfx('patch-heal');

    if (viewer.hand.length > previousViewer.hand.length) playSfx('card-draw');
    if (state.turn > previous.turn && state.activePlayerId === state.viewerId) playSfx('turn-start');
  }, [state]);
}
