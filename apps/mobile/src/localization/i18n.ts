import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { translationConfig } from '@/localization/config';

export const i18n = createInstance();
void i18n.use(initReactI18next).init({ ...translationConfig, react: { useSuspense: false } });
