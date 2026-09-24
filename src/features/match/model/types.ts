import type { CardDefinition } from '../../../game/types';

export type MatchSelection =
  | { kind: 'card'; id: string; definition: CardDefinition }
  | { kind: 'attacker'; id: string }
  | null;
