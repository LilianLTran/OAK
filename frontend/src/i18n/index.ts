/**
 * Minimal i18n layer, ready for Vietnamese: create vi.ts matching the shape of
 * en.ts, register it below, and switch `locale`.
 */
import { en, Strings } from './en';

const locales: Record<string, Strings> = { en };
let locale = 'en';

export function setLocale(l: string) {
  if (locales[l]) locale = l;
}

/** Current dictionary — use like: t().search.title */
export function t(): Strings {
  return locales[locale];
}
