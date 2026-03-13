import { en } from './en';
import { ru } from './ru';
import type { Language } from '../context/LanguageContext';
import type { TranslationKeys } from './en';

const translations: Record<Language, Record<string, string>> = {
  en: en as Record<string, string>,
  ru: ru as Record<string, string>,
};

export function t(
  language: Language,
  key: TranslationKeys,
  params?: Record<string, string>
): string {
  const str = translations[language]?.[key] ?? translations.en[key] ?? key;
  if (!params) return str;
  return Object.entries(params).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), v),
    str
  );
}

export { en, ru };
export type { TranslationKeys } from './en';
