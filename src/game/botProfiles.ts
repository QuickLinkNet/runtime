import rawBotProfiles from '../../shared/bot-profiles.json';

export type BotProfileKey = keyof typeof rawBotProfiles;

export interface BotProfile {
  name: string;
  label: string;
  description: string;
  strategy: string;
  accent: 'lime' | 'cyan' | 'orange';
}

export const botProfiles = rawBotProfiles as Record<BotProfileKey, BotProfile & { deck: string[] }>;
export const botProfileKeys = Object.keys(botProfiles) as BotProfileKey[];
