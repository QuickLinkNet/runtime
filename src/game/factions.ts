import rawProfiles from '../../shared/faction-profiles.json';
import type { Domain } from './types';

export interface FactionProfile {
  name: string;
  identity: string;
  fantasy: string;
  verbs: string[];
  strengths: string[];
  weaknesses: string[];
  designRule: string;
}

export const factionProfiles = rawProfiles as Record<Exclude<Domain, 'token'>, FactionProfile>;

export function factionProfile(domain: Domain): FactionProfile | undefined {
  return domain === 'token' ? undefined : factionProfiles[domain];
}
