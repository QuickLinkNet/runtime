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
  costModifierUntilPlayed?: boolean;
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
  deployedTurn: number;
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
  reward: { firstWinBooster: boolean; credits: number; matchCredits: number; winBonus: number; mastery?: MasteryReward; dailyProgress?: ContractProgress[] };
  incident: WeeklyIncident | null;
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

export interface DeckSlot {
  id: string;
  name: string;
  deck: string[];
  isActive: boolean;
  updatedAt: string;
}

export interface DeckSlotsSnapshot { slots: DeckSlot[] }

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

export interface BalanceReport {
  id: string;
  createdAt: string;
  simulatedMatches: number;
  report: {
      summary: { simulatedMatches: number; matchesPerPair: number; averageTurns: number; draws: number; guardTerminations: number; coreTieBreaks: number; firstPlayerWinRate: number; confidence: BalanceConfidence; cardsCovered: number; cardsTotal: number; coveragePercent: number; testDecks: number };
      archetypes: Array<{ id: string; name: string; suite: 'reference' | 'coverage'; games: number; winRate: number; avgTurns: number; confidence: BalanceConfidence; winRateInterval: BalanceInterval }>;
      matchups: Array<{ left: string; right: string; suite: 'reference' | 'coverage'; games: number; leftWins: number; rightWins: number; draws: number; turns: number; leftWinRate: number; rightWinRate: number; avgTurns: number; imbalance: number; confidence: BalanceConfidence }>;
      factions: Array<{ id: Domain; games: number; winRate: number; confidence: BalanceConfidence; winRateInterval: BalanceInterval }>;
      coverageFactions: Array<{ id: Domain; games: number; winRate: number; confidence: BalanceConfidence; winRateInterval: BalanceInterval }>;
      cards: Array<{ definitionId: string; games: number; possibleGames: number; draws: number; plays: number; playRate: number; playConversion: number; impactPerGame: number; winRate: number; domain: Domain; confidence: BalanceConfidence }>;
      cardAudit: Array<{ definitionId: string; name: string; domain: Domain; type: CardType; score: number; status: 'solid' | 'watch' | 'review'; summary: string; signals: Array<{ severity: 'medium' | 'high'; text: string }>; proposals: string[] }>;
      coverage: Array<{ domain: Domain; role: string; cards: number; target: number; gap: number }>;
      quality: { simulationConfidence: BalanceConfidence; liveConfidence: BalanceConfidence; method: string; nextStep: string };
      recommendations: Array<{ id: string; tone: BalanceTone; scope: string; confidence: BalanceConfidence; samples: number; evidence: string; proposal: string; message: string }>;
      live: { recordedMatches: number; factions: Array<{ id: Domain; games: number; winRate: number; confidence: BalanceConfidence; winRateInterval: BalanceInterval }>; cards: Array<{ definitionId: string; domain: Domain; games: number; draws: number; plays: number; playConversion: number; impactPerGame: number; winRate: number; confidence: BalanceConfidence }>; feedback: { responses: number; easy: number; fair: number; hard: number; coverage: number } };
    };
  reviews: Record<string, { status: 'open' | 'accepted' | 'dismissed'; note: string; updatedAt: string }>;
}

export type BalanceConfidence = 'low' | 'medium' | 'high';
export type BalanceTone = 'buff' | 'nerf' | 'matchup' | 'system' | 'new-card' | 'live-check' | 'observe';
export interface BalanceInterval { low: number; high: number; }

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
  contracts: { cycleKey: string; items: ContractProgress[]; dailyCycleKey: string; dailyItems: ContractProgress[]; dailyStreak: number };
  mastery: FactionMastery[];
  rivalries: Rivalry[];
  incident: WeeklyIncident;
}

export interface FactionMastery { faction: Domain; xp: number; level: number; matchesPlayed: number; wins: number; nextLevelXp: number }
export interface MasteryReward { xpGain: number; items: FactionMastery[] }
export interface Rivalry { name: string; matchesPlayed: number; wins: number; losses: number; lastPlayedAt: string }
export interface WeeklyIncident { id: string; name: string; description: string; rule: string }

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
