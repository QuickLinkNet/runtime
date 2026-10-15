import { messages, type Locale } from './messages';

export const supportedLocales: readonly Locale[] = ['de', 'en', 'nl'];
export const defaultLocale: Locale = 'de';
export const localeStorageKey = 'runtime.locale';

let activeLocale: Locale = defaultLocale;

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && supportedLocales.includes(value as Locale);
}

export function preferredLocale(): Locale {
  const stored = localStorage.getItem(localeStorageKey);
  if (isLocale(stored)) return stored;
  const browserLocale = navigator.language.toLowerCase().split('-')[0];
  return isLocale(browserLocale) ? browserLocale : defaultLocale;
}

export function setActiveLocale(locale: Locale): void {
  activeLocale = locale;
}

export function getActiveLocale(): Locale {
  return activeLocale;
}

export function translate(key: string, values: Record<string, string | number> = {}): string {
  const message = messages[key];
  const template = message?.[activeLocale] ?? message?.[defaultLocale] ?? key;
  return Object.entries(values).reduce(
    (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

export const t = translate;
