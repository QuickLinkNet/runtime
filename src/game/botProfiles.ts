import rawBotProfiles from '../../shared/bot-profiles.json';
import { getActiveLocale } from '../i18n/runtime';
import type { Locale } from '../i18n/messages';

export type BotProfileKey = keyof typeof rawBotProfiles;

export interface BotProfile {
  name: string;
  label: string;
  description: string;
  strategy: string;
  accent: 'lime' | 'cyan' | 'orange';
}

type LocalizedProfile = Record<Locale, Pick<BotProfile, 'name' | 'label' | 'description' | 'strategy'>>;

const copy: Record<BotProfileKey, LocalizedProfile> = {
  junior: {
    de: { name: 'Junior Bot', label: 'BUILD APPRENTICE', description: 'Macht gelegentlich vorschnelle Deploys und suboptimale Trades. Ideal zum Kennenlernen neuer Stacks.', strategy: 'Unberechenbar' },
    en: { name: 'Junior Bot', label: 'BUILD APPRENTICE', description: 'Occasionally rushes deployments and makes suboptimal trades. Ideal for learning new stacks.', strategy: 'Unpredictable' },
    nl: { name: 'Junior Bot', label: 'BUILD APPRENTICE', description: 'Doet soms overhaaste deploys en minder goede trades. Ideaal om nieuwe stacks te leren kennen.', strategy: 'Onvoorspelbaar' },
  },
  security: {
    de: { name: 'Security Auditor', label: 'DEFENSIVE CONTROL', description: 'Sichert den Core mit FIREWALL, REDUNDANCY und PATCH. Seine Konter zwingen dich zu sauberen Lines.', strategy: 'Defensiv' },
    en: { name: 'Security Auditor', label: 'DEFENSIVE CONTROL', description: 'Secures the Core with FIREWALL, REDUNDANCY, and PATCH. Its counters force you to play clean lines.', strategy: 'Defensive' },
    nl: { name: 'Security Auditor', label: 'DEFENSIVE CONTROL', description: 'Beveiligt de Core met FIREWALL, REDUNDANCY en PATCH. Zijn counters dwingen je tot zorgvuldige zetten.', strategy: 'Defensief' },
  },
  chaos: {
    de: { name: 'Chaos Engineer', label: 'INCIDENT RESPONSE', description: 'Provoziert CRASH-Momente, skaliert Replicas und setzt langsame Stacks mit BUGs unter Druck.', strategy: 'Aggressiv' },
    en: { name: 'Chaos Engineer', label: 'INCIDENT RESPONSE', description: 'Provokes CRASH events, scales Replicas, and pressures slow stacks with BUGs.', strategy: 'Aggressive' },
    nl: { name: 'Chaos Engineer', label: 'INCIDENT RESPONSE', description: 'Lokt CRASH-momenten uit, schaalt Replicas en zet trage stacks met BUGs onder druk.', strategy: 'Agressief' },
  },
};

function localizeProfile(key: BotProfileKey): BotProfile & { deck: string[] } {
  const source = rawBotProfiles[key];
  const profile = { ...source } as BotProfile & { deck: string[] };
  for (const field of ['name', 'label', 'description', 'strategy'] as const) {
    Object.defineProperty(profile, field, { enumerable: true, get: () => copy[key][getActiveLocale()][field] });
  }
  return profile;
}

export const botProfiles = Object.fromEntries(
  (Object.keys(rawBotProfiles) as BotProfileKey[]).map((key) => [key, localizeProfile(key)]),
) as Record<BotProfileKey, BotProfile & { deck: string[] }>;

export const botProfileKeys = Object.keys(botProfiles) as BotProfileKey[];
