import { useTranslation } from 'react-i18next';

import { usePreferences } from '@/preferences/context';

/** A fixed language keeps translations derived from the same state as Settings. */
export function useAppTranslation() {
  const { language } = usePreferences();
  const { t } = useTranslation('translation', { lng: language });
  return { t, language, accessibilityLanguage: language === 'uk' ? 'uk-UA' : 'en-US' };
}
