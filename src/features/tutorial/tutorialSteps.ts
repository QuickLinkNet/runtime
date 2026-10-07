import type { GameAction, GameState, TutorialStepKey } from '../../game/types';

export type TutorialFocus = 'hand' | 'infrastructure' | 'enemy-core' | 'debug' | 'own-services' | 'enemy-services';

export interface TutorialStepDefinition {
  eyebrow: string;
  title: string;
  instruction: string;
  objective: string;
  success: string;
  focus: TutorialFocus;
}

export const tutorialSteps: Record<TutorialStepKey, TutorialStepDefinition> = {
  'deploy-service': {
    eyebrow: '01 · COMPUTE & DEPLOY',
    title: 'Bring einen Service online',
    instruction: 'Compute ist deine Ressource. Die Zahl links oben auf einer Karte zeigt ihre Kosten.',
    objective: 'Spiele React Component aus deiner Hand.',
    success: 'Service deployed. Der DEPLOY-Effekt hat zusätzlich eine Child Component erzeugt.',
    focus: 'hand',
  },
  'deploy-infrastructure': {
    eyebrow: '02 · INFRASTRUCTURE',
    title: 'Baue das Fundament',
    instruction: 'Infrastructure belegt eigene Slots und verändert dauerhaft, wie dein Stack arbeitet.',
    objective: 'Spiele State Store aus deiner Hand.',
    success: 'State Store ist aktiv. Infrastructure greift nicht an, verstärkt aber deine Strategie.',
    focus: 'hand',
  },
  'attack-core': {
    eyebrow: '03 · COMBAT',
    title: 'Greife den Core an',
    instruction: 'Bereite Services greifen einmal pro Zug an. Wähle zuerst deinen Service und danach das Ziel.',
    objective: 'Wähle React Component und greife den gegnerischen Core an.',
    success: 'Treffer bestätigt. Fällt ein Core auf 0, endet das Match.',
    focus: 'enemy-core',
  },
  'debug-bug': {
    eyebrow: '04 · BUG & DEBUG',
    title: 'Bereinige dein System',
    instruction: 'BUGs blockieren Service-Slots. DEBUG entfernt einen eigenen BUG für 1 Compute.',
    objective: 'Nutze die Schaltfläche DEBUG.',
    success: 'BUG entfernt. Dein Service-Slot ist wieder frei.',
    focus: 'debug',
  },
  'patch-service': {
    eyebrow: '05 · PATCH',
    title: 'Repariere einen Service',
    instruction: 'PATCH stellt Integrity wieder her, aber niemals über das aufgedruckte Maximum hinaus.',
    objective: 'Spiele Emergency Patch auf den beschädigten Docker Container.',
    success: 'Integrity wiederhergestellt. Beschädigte Services bleiben damit länger online.',
    focus: 'own-services',
  },
  'crash-service': {
    eyebrow: '06 · CRASH',
    title: 'Nimm einen Service vom Board',
    instruction: 'Services fügen sich im Kampf gleichzeitig Schaden zu. Bei 0 Integrity crashen sie.',
    objective: 'Greife den Junior Developer mit Chaos Monkey an.',
    success: 'Der gegnerische Service ist gecrasht und in den Trash gewandert.',
    focus: 'enemy-services',
  },
  'replace-infrastructure': {
    eyebrow: '07 · SLOT MANAGEMENT',
    title: 'Ersetze Infrastructure',
    instruction: 'Du hast nur zwei Infrastructure-Slots. Eine neue Karte darf eine bestehende ersetzen.',
    objective: 'Spiele CI Pipeline und wähle eine deiner beiden Infrastructure-Karten zum Ersetzen.',
    success: 'Infrastructure ausgetauscht. So passt du deinen Stack auch im laufenden Match an.',
    focus: 'infrastructure',
  },
  'final-deploy': {
    eyebrow: '08 · PRODUCTION DEPLOY',
    title: 'Bring das System zu Fall',
    instruction: 'Der gegnerische Core hat exakt 7 Integrity. Deine drei Services liefern zusammen 7 Power.',
    objective: 'Greife mit allen drei Services den gegnerischen Core an.',
    success: 'Production erfolgreich. Du bist bereit für dein erstes echtes Match.',
    focus: 'enemy-core',
  },
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
