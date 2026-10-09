export type Domain = 'frontend' | 'backend' | 'infrastructure' | 'data' | 'security' | 'ai' | 'neutral' | 'token';
export type CardType = 'service' | 'command' | 'infrastructure';
export type CardRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface CardDefinition {
  id: string;
  name: string;
  domain: Domain;
  type: CardType;
  cost: number;
  power?: number;
  integrity?: number;
  keywords: string[];
  effectId?: string;
  overclockCost?: number;
  text: string;
  flavorText: string;
  token?: boolean;
  cannotAttack?: boolean;
}

export interface CardInstance {
  instanceId: string;
  definitionId: string;
  costModifier?: number;
  costModifierTurn?: number;
}

export interface BoardEntity extends CardInstance {
  power: number;
  integrity: number;
  maxIntegrity: number;
  redundancy: boolean;
  sandboxed: boolean;
  sandboxUntilTurn: number;
  exhausted: boolean;
  temporaryPower: number;
}

export interface PlayerView {
  id: string;
  name: string;
  isBot: boolean;
  botProfile: string | null;
  domains: Domain[];
  core: number;
  deckCount: number;
  handCount: number;
  hand: CardInstance[];
  services: BoardEntity[];
  infrastructure: BoardEntity[];
  trash: CardInstance[];
  trashCount: number;
  maxCompute: number | null;
  compute: number | null;
  temporaryCompute: number | null;
  fatigue: number;
  mulliganDone: boolean | null;
  consecutiveTimeouts: number;
  canDecommission: boolean;
  matchStats: MatchStats;
}

export interface MatchStats {
  cardsPlayed: number;
  servicesDeployed: number;
  infrastructureDeployed: number;
  commandsPlayed: number;
  attacks: number;
  coreDamageDealt: number;
  bugsCreated: number;
  replicasCreated: number;
  servicesCrashed: number;
  mvpDefinitionId: string | null;
}

export interface GameEvent {
  id: string;
  type: string;
  sequence: number;
  playerId?: string;
  sourcePlayerId?: string;
  targetId?: string;
  attackerId?: string;
  entityId?: string;
  sourceId?: string;
  cardInstanceId?: string;
  definitionId?: string;
  amount?: number;
  prevented?: number;
  cost?: number;
  count?: number;
  turn?: number;
  outcome?: string;
  winnerId?: string;
  reason?: string;
}

export interface GameState {
  roomCode: string;
  mode: 'single' | 'multi' | 'tutorial';
  status: 'lobby' | 'mulligan' | 'active' | 'finished' | 'abandoned';
  viewerId: string;
  order: string[];
  players: Record<string, PlayerView>;
  activePlayerId: string | null;
  startingPlayerId: string | null;
  turn: number;
  turnStartedAt: string | null;
  turnDeadlineAt: string | null;
  winnerId: string | null;
  finishReason: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  reward: { firstWinBooster: boolean; credits: number; matchCredits: number; winBonus: number };
  events: GameEvent[];
  tutorial?: TutorialProgress;
}

export interface TutorialProgress {
  step: number;
  totalSteps: number;
  key: TutorialStepKey;
  objectiveComplete: boolean;
  completed: boolean;
  rewardGranted: boolean;
}

export type TutorialStepKey =
  | 'deploy-service'
  | 'deploy-infrastructure'
  | 'attack-core'
  | 'debug-bug'
  | 'patch-service'
  | 'crash-service'
  | 'replace-infrastructure'
  | 'final-deploy';

export interface MatchPayload {
  roomCode?: string;
  version: number;
  state: GameState;
  timedOut?: boolean;
  replayed?: boolean;
}

export type GameAction = (
  | { type: 'MULLIGAN'; cardInstanceIds: string[] }
  | { type: 'PLAY_CARD'; cardInstanceId: string; targetId?: string; overclock?: boolean }
  | { type: 'ATTACK'; attackerId: string; targetId: string }
  | { type: 'DEBUG'; targetId: string }
  | { type: 'DECOMMISSION'; cardInstanceId: string }
  | { type: 'END_TURN' }
  | { type: 'CONTINUE_TUTORIAL' }
) & { clientActionId?: string };

export interface PlayerIdentity {
  id: string;
  name: string;
  tutorialCompleted?: boolean;
  isAccount: boolean;
  accountEmail: string | null;
  isAdmin: boolean;
}

export interface AdminAuditEntry {
  id: number;
  action: string;
  detailsJson: string;
  createdAt: string;
  adminName: string;
  targetName: string | null;
}

export interface AdminPlayerSummary {
  id: string;
  name: string;
  account_email: string | null;
  created_at: string;
  last_seen_at: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  credits: number;
  components: number;
  boosterBalance: number;
  uniqueCards: number;
  totalCards: number;
}

export interface AdminPlayerDetail {
  player: AdminPlayerSummary & { totalCreditsEarned: number; totalBoostersOpened: number };
  cards: Array<{ definitionId: string; quantity: number }>;
  deck: string[] | null;
  audit: AdminAuditEntry[];
}

export interface AdminOverview {
  summary: { players: number; accounts: number; credits: number; components: number; unopenedBoosters: number; collectedCards: number };
  recentAudit: AdminAuditEntry[];
}

export interface CollectionSnapshot {
  cards: Record<string, number>;
  uniqueCards: number;
  totalCards: number;
  credits: number;
  components: number;
  excessCopies: number;
  boosterPrice: number;
  boosterBalance: number;
  unlimitedBoosters: boolean;
  totalBoostersOpened: number;
  contracts: { cycleKey: string; items: ContractProgress[] };
}

export interface ContractProgress {
  key: string;
  label: string;
  description: string;
  goal: number;
  credits: number;
  components: number;
  progress: number;
  claimed: boolean;
  claimable: boolean;
}

export interface BoosterCard {
  definitionId: string;
  rarity: CardRarity;
  previousQuantity: number;
  isNew: boolean;
  salvaged?: boolean;
  salvageValue?: number;
}

export interface BoosterOpening {
  openingId: string;
  cards: BoosterCard[];
  collection: CollectionSnapshot;
}
