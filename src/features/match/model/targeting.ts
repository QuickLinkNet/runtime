import { cardById } from '../../../game/catalog';
import type { BoardEntity, CardDefinition, GameState, PlayerView } from '../../../game/types';
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
  'feature_flag',
  'retry_storm',
  'terraform_apply',
  'penetration_tester_deploy',
  'rotate_secrets',
  'model_drift',
  'error_boundary_deploy',
  'dead_letter_queue',
  'rolling_deploy',
  'access_review',
  'containment_plan',
  'inference_burst',
]);

const bugCleanerEffects = new Set([
  'rubber_duck_deploy', 'qa_engineer_deploy', 'senior_developer_deploy', 'soc_analyst_deploy',
]);

export function canPlayIntoServiceBoard(definition: CardDefinition, player: PlayerView): boolean {
  const effect = definition.effectId ?? '';
  const openSlots = 5 - player.services.length;
  const requiredSlots = effect === 'react_component_deploy'
    ? 2
    : (definition.type === 'service' || ['component_library', 'horizontal_scaling'].includes(effect) ? 1 : 0);
  if (requiredSlots <= openSlots) return true;
  return definition.type === 'service'
    && requiredSlots === 1
    && bugCleanerEffects.has(effect)
    && player.services.some((service) => service.definitionId === 'token-bug');
}

export function canPlayWithoutTarget(selection: MatchSelection, player: PlayerView, opponent?: PlayerView): boolean {
  if (selection?.kind !== 'card') return false;
  if (!canPlayIntoServiceBoard(selection.definition, player)) return false;
  if (selection.definition.type === 'infrastructure' && player.infrastructure.length >= 2) return false;
  const effect = selection.definition.effectId ?? '';
  return !targetedEffects.has(effect)
    || effect === 'security_engineer_deploy'
    || (effect === 'web_worker_deploy'
      && !player.services.some((service) => cardById.get(service.definitionId)?.domain === 'frontend'))
    || (effect === 'sandbox_container_deploy' && (opponent?.services.length ?? 0) === 0)
    || (effect === 'penetration_tester_deploy' && (opponent?.services.length ?? 0) === 0);
}

export function canTargetEntity(selection: MatchSelection, viewerId: string, entity: BoardEntity, ownerId: string, zone: 'services' | 'infrastructure', stateTurn?: number): boolean {
  if (!selection) return false;
  const own = ownerId === viewerId;
  if (selection.kind === 'attacker') return !own;

  const effect = selection.definition.effectId ?? '';
  if (zone === 'infrastructure') return (selection.definition.type === 'infrastructure' && own)
    || effect === 'hotfix'
    || (effect === 'emergency_patch' && own)
    || (effect === 'terraform_apply' && own);

  const allowedEffects = new Set([
    'hotfix',
    'force_push',
    ...(own
      ? ['coffee', 'web_worker_deploy', 'security_engineer_deploy', 'emergency_patch', 'feature_flag', 'retry_storm', 'rotate_secrets', 'error_boundary_deploy', 'dead_letter_queue', 'rolling_deploy', 'containment_plan', 'inference_burst']
      : ['sandbox_container_deploy', 'penetration_tester_deploy', 'model_drift', 'access_review']),
  ]);

  if (effect === 'error_boundary_deploy') return own && cardById.get(entity.definitionId)?.domain === 'frontend';
  if (effect === 'inference_burst') return own
    && cardById.get(entity.definitionId)?.domain === 'ai'
    && entity.deployedTurn === stateTurn;
  if (effect === 'infinite_rerender') return !own;
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

export function selectionPrompt(selection: MatchSelection, player?: PlayerView): string {
  if (selection?.kind === 'attacker') return 'Wähle einen gegnerischen Service oder den Core.';
  if (selection?.kind !== 'card') return '';
  if (selection.definition.type === 'infrastructure' && (player?.infrastructure.length ?? 0) >= 2) {
    return '2/2 Slots belegt. Wähle die eigene Infrastructure, die in den Trash wandert.';
  }

  const prompts: Record<string, string> = {
    infinite_rerender: 'Wähle einen gegnerischen Service für die Sandbox.',
    hotfix: 'Wähle einen Service oder eine Infrastructure.',
    horizontal_scaling: 'Wähle einen eigenen günstigen Service.',
    emergency_patch: 'Wähle eine eigene Karte oder deinen Core.',
    coffee: 'Wähle einen eigenen Service.',
    force_push: 'Wähle einen Service.',
    web_worker_deploy: 'Optional: Wähle einen eigenen Service.',
    security_engineer_deploy: 'Optional: Wähle einen eigenen Service.',
    sandbox_container_deploy: 'Wähle einen gegnerischen Service.',
    feature_flag: 'Wähle einen eigenen Service.',
    retry_storm: 'Wähle einen eigenen Service.',
    terraform_apply: 'Wähle eine eigene Infrastructure.',
    penetration_tester_deploy: 'Wähle einen gegnerischen Service.',
    rotate_secrets: 'Wähle einen eigenen Service.',
    model_drift: 'Wähle einen gegnerischen Service.',
    error_boundary_deploy: 'Wähle einen eigenen Frontend-Service.',
    dead_letter_queue: 'Wähle einen eigenen Service.',
    rolling_deploy: 'Wähle einen eigenen Service.',
    access_review: 'Wähle einen gegnerischen Service.',
    containment_plan: 'Wähle einen eigenen Service.',
    inference_burst: 'Wähle den frisch ausgespielten AI-Service.',
  };

  return prompts[selection.definition.effectId ?? ''] ?? 'Karte ist bereit zum Ausspielen.';
}
