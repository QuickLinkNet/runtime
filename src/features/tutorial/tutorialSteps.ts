import type { GameAction, GameState, TutorialStepKey } from '../../game/types';
import { t } from '../../i18n';

export type TutorialFocus = 'hand' | 'infrastructure' | 'enemy-core' | 'debug' | 'own-services' | 'enemy-services';

export interface TutorialStepDefinition {
  eyebrow: string;
  title: string;
  instruction: string;
  objective: string;
  success: string;
  focus: TutorialFocus;
}

function localizedStep(key: TutorialStepKey, focus: TutorialFocus): TutorialStepDefinition {
  return {
    get eyebrow() { return t(`tutorial.${key}.eyebrow`); },
    get title() { return t(`tutorial.${key}.title`); },
    get instruction() { return t(`tutorial.${key}.instruction`); },
    get objective() { return t(`tutorial.${key}.objective`); },
    get success() { return t(`tutorial.${key}.success`); },
    focus,
  };
}

export const tutorialSteps: Record<TutorialStepKey, TutorialStepDefinition> = {
  'deploy-service': localizedStep('deploy-service', 'hand'),
  'deploy-infrastructure': localizedStep('deploy-infrastructure', 'hand'),
  'attack-core': localizedStep('attack-core', 'enemy-core'),
  'debug-bug': localizedStep('debug-bug', 'debug'),
  'patch-service': localizedStep('patch-service', 'own-services'),
  'crash-service': localizedStep('crash-service', 'enemy-services'),
  'replace-infrastructure': localizedStep('replace-infrastructure', 'infrastructure'),
  'final-deploy': localizedStep('final-deploy', 'enemy-core'),
};

function definitionForInstance(state: GameState, instanceId: string): string | null {
  for (const player of Object.values(state.players)) {
    for (const zone of [player.hand, player.services, player.infrastructure]) {
      const found = zone.find((item) => item.instanceId === instanceId);
      if (found) return found.definitionId;
    }
  }
  return null;
}

export function tutorialAllowsAction(state: GameState, action: GameAction): boolean {
  const key = state.tutorial?.key;
  if (!key || state.tutorial?.objectiveComplete) return false;
  const opponentId = state.order.find((id) => id !== state.viewerId);
  const targetDefinition = 'targetId' in action && action.targetId
    ? definitionForInstance(state, action.targetId)
    : null;

  switch (key) {
    case 'deploy-service':
      return action.type === 'PLAY_CARD' && definitionForInstance(state, action.cardInstanceId) === 'frontend-react-component';
    case 'deploy-infrastructure':
      return action.type === 'PLAY_CARD' && definitionForInstance(state, action.cardInstanceId) === 'frontend-state-store';
    case 'attack-core':
      return action.type === 'ATTACK' && action.targetId === `core:${opponentId}`;
    case 'debug-bug':
      return action.type === 'DEBUG' && targetDefinition === 'token-bug';
    case 'patch-service':
      return action.type === 'PLAY_CARD'
        && definitionForInstance(state, action.cardInstanceId) === 'security-emergency-patch'
        && targetDefinition === 'infrastructure-docker-container';
    case 'crash-service':
      return action.type === 'ATTACK'
        && definitionForInstance(state, action.attackerId) === 'infrastructure-chaos-monkey'
        && targetDefinition === 'neutral-junior-developer';
    case 'replace-infrastructure':
      return action.type === 'PLAY_CARD'
        && definitionForInstance(state, action.cardInstanceId) === 'neutral-ci-pipeline'
        && targetDefinition !== null;
    case 'final-deploy':
      return action.type === 'ATTACK' && action.targetId === `core:${opponentId}`;
  }
  return false;
}

export function tutorialAllowsCard(state: GameState, definitionId: string): boolean {
  const expected: Partial<Record<TutorialStepKey, string>> = {
    'deploy-service': 'frontend-react-component',
    'deploy-infrastructure': 'frontend-state-store',
    'patch-service': 'security-emergency-patch',
    'replace-infrastructure': 'neutral-ci-pipeline',
  };
  return expected[state.tutorial?.key ?? 'final-deploy'] === definitionId;
}
