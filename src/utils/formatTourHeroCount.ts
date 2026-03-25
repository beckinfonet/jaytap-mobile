import type { Language } from '../context/LanguageContext';
import type { TranslationKeys } from '../locales';

type TFn = (key: TranslationKeys, params?: Record<string, string>) => string;

/** Localized “N tour(s)” for the 3D tour hero card (English + Russian plural rules). */
export function formatTourHeroCount(count: number, language: Language, t: TFn): string {
  const c = String(count);
  if (language === 'en') {
    return count === 1
      ? t('tour.heroTourCountOne', { count: c })
      : t('tour.heroTourCountOther', { count: c });
  }
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) {
    return t('tour.heroTourCountMany', { count: c });
  }
  if (mod10 === 1) {
    return t('tour.heroTourCountOne', { count: c });
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return t('tour.heroTourCountFew', { count: c });
  }
  return t('tour.heroTourCountMany', { count: c });
}
