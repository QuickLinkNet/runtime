import { cardById } from '../../../game/catalog';
import type { BoardEntity, GameState, PlayerView } from '../../../game/types';
import type { MatchSelection } from './types';

const targetedEffects = new Set([
  'infinite_rerender',
  'hotfix',
  'horizontal_scaling',
  'emergency_patch',
  'coffee',
  'force_push',
  'web_worker_deploy',
  'security_engineer_deploy',
  'sandbox_container_deploy',
]);

export function canPlayWithoutTarget(selection: MatchSelection, player: PlayerView, opponent?: PlayerView): boolean {
  if (selection?.kind !== 'card') return false;
  const effect = selection.definition.effectId ?? '';
  return !targetedEffects.has(effect)
    || effect === 'security_engineer_deploy'
    || (effect === 'web_worker_deploy'
      && !player.services.some((service) => cardById.get(service.definitionId)?.domain === 'frontend'))
    || (effect === 'sandbox_container_deploy' && (opponent?.services.length ?? 0) === 0);
}

export function canTargetEntity(selection: MatchSelection, viewerId: string, entity: BoardEntity, ownerId: string, zone: 'services' | 'infrastructure'): boolean {
  if (!selection) return false;
  const own = ownerId === viewerId;
  if (selection.kind === 'attacker') return !own;

  const effect = selection.definition.effectId ?? '';
  if (zone === 'infrastructure') return effect === 'hotfix' || (effect === 'emergency_patch' && own);

  const allowedEffects = new Set([
    'infinite_rerender',
    'hotfix',
    'force_push',
    ...(own
      ? ['coffee', 'web_worker_deploy', 'security_engineer_deploy', 'emergency_patch']
      : ['sandbox_container_deploy']),
  ]);

  return allowedEffects.has(effect)
    || (effect === 'horizontal_scaling' && own && (cardById.get(entity.definitionId)?.cost ?? 99) <= 3);
}

export function canTargetCore(selection: MatchSelection, state: GameState, ownerId: string): boolean {
  if (!selection) return false;
  if (selection.kind === 'attacker') {
    const owner = state.players[ownerId];
    const firewall = owner.services.some((service) => (
      !service.sandboxed && cardById.get(service.definitionId)?.keywords.includes('FIREWALL')
    ));
    return ownerId !== state.viewerId && !firewall;
  }
  return selection.definition.effectId === 'emergency_patch' && ownerId === state.viewerId;
}

export function canSelectAttacker(entity: BoardEntity): boolean {
  const definition = cardById.get(entity.definitionId);
  return !entity.exhausted && !entity.sandboxed && !definition?.cannotAttack;
}
