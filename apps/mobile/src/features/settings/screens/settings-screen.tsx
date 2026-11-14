import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/ui/action-button';
import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import type { ThemeColors } from '@/design-system/tokens';
import { radii, spacing } from '@/design-system/tokens';
import { useTheme, useThemeStyles } from '@/design-system/use-theme';
import { PreferenceOption } from '@/features/settings/components/preference-option';
import { useAppTranslation } from '@/localization/use-app-translation';
import { usePreferences } from '@/preferences/context';

const languageOptions = ['system', 'en', 'uk'] as const;
const appearanceOptions = ['system', 'light', 'dark'] as const;

export function SettingsScreen() {
  const { t } = useAppTranslation();
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const { preferences, language, theme, setLanguage, setAppearance, storageStatus, retrySave } =
    usePreferences();
  return (
    <Screen>
      <View style={styles.intro}>
        <AppText variant="eyebrow" tone="accent">
          {t('settings.eyebrow')}
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          {t('settings.title')}
        </AppText>
        <AppText tone="secondary">{t('settings.description')}</AppText>
      </View>
      <View style={styles.section}>
        <View style={styles.heading}>
          <View style={styles.sectionIcon}>
            <Icon name="character.bubble" color={colors.accent} />
          </View>
          <View style={styles.copy}>
            <AppText variant="heading" accessibilityRole="header">
              {t('settings.languageTitle')}
            </AppText>
            <AppText variant="caption" tone="secondary">
              {t('settings.languageDescription')}
            </AppText>
          </View>
        </View>
        <View style={styles.options}>
          {languageOptions.map((option) => (
            <PreferenceOption
              key={option}
              label={t(`language.${option}`)}
              description={
                option === 'system'
                  ? t('settings.current', { value: t(`language.${language}`) })
                  : undefined
              }
              hint={t('settings.languageHint')}
              selected={preferences.language === option}
              onPress={() => setLanguage(option)}
            />
          ))}
        </View>
      </View>
      <View style={styles.section}>
        <View style={styles.heading}>
          <View style={styles.sectionIcon}>
            <Icon name="circle.lefthalf.filled" color={colors.accent} />
          </View>
          <View style={styles.copy}>
            <AppText variant="heading" accessibilityRole="header">
              {t('settings.appearanceTitle')}
            </AppText>
            <AppText variant="caption" tone="secondary">
              {t('settings.appearanceDescription')}
            </AppText>
          </View>
        </View>
        <View style={styles.options}>
          {appearanceOptions.map((option) => (
            <PreferenceOption
              key={option}
              label={t(`appearance.${option}`)}
              description={
                option === 'system'
                  ? t('settings.current', { value: t(`appearance.${theme}`) })
                  : undefined
              }
              hint={t('settings.appearanceHint')}
              selected={preferences.appearance === option}
              onPress={() => setAppearance(option)}
            />
          ))}
        </View>
      </View>
      <View style={styles.storage}>
        <AppText
          variant="caption"
          tone={storageStatus === 'error' ? 'primary' : 'muted'}
          accessibilityLiveRegion="polite"
        >
          {t(
            storageStatus === 'saving'
              ? 'settings.saving'
              : storageStatus === 'error'
                ? 'settings.storageError'
                : 'settings.saved',
          )}
        </AppText>
        {storageStatus === 'error' ? (
          <ActionButton label={t('settings.retry')} variant="secondary" onPress={retrySave} />
        ) : null}
        <AppText variant="caption" tone="muted">
          {t('settings.footer')}
        </AppText>
      </View>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    intro: { paddingTop: spacing.lg, gap: spacing.md },
    section: {
      padding: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      gap: spacing.lg,
    },
    heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    sectionIcon: {
      width: 44,
      height: 44,
      backgroundColor: colors.accentSurface,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: { flex: 1, gap: spacing.xs },
    options: { gap: spacing.sm },
    storage: { gap: spacing.lg, paddingBottom: spacing.lg },
  });
