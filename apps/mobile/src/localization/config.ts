import { en } from './resources/en.ts';
import { uk } from './resources/uk.ts';

export const translationConfig = {
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en', 'uk'],
  resources: { en: { translation: en }, uk: { translation: uk } },
  defaultNS: 'translation' as const,
  keySeparator: false as const,
  returnNull: false as const,
  initAsync: false,
  interpolation: { escapeValue: false },
};
