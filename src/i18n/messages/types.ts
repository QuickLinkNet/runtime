export type Locale = 'de' | 'en' | 'nl';

export interface LocalizedMessage {
  de: string;
  en: string;
  nl: string;
}

export type MessageCatalog = Record<string, LocalizedMessage>;
