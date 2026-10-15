import { adminMessages } from './admin';
import { balanceMessages } from './balance';
import { commonMessages } from './common';
import { gameMessages } from './game';
import { pageMessages } from './pages';
import type { MessageCatalog } from './types';

export const messages: MessageCatalog = {
  ...commonMessages,
  ...pageMessages,
  ...gameMessages,
  ...adminMessages,
  ...balanceMessages,
};

export type { Locale, LocalizedMessage, MessageCatalog } from './types';
