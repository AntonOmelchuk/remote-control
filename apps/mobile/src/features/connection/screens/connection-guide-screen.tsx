import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/ui/action-button';
import { AppText } from '@/components/ui/app-text';
import type { IconName } from '@/components/ui/icon';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import type { ThemeColors } from '@/design-system/tokens';
import { radii, spacing } from '@/design-system/tokens';
import { useTheme, useThemeStyles } from '@/design-system/use-theme';
import { useAppTranslation } from '@/localization/use-app-translation';

const steps = [
  {
    icon: 'laptopcomputer',
    title: 'guide.companionTitle',
    description: 'guide.companionDescription',
  },
  {
    icon: 'wifi',
    title: 'guide.networkTitle',
    description: 'guide.networkDescription',
  },
  {
    icon: 'qrcode',
    title: 'guide.pairingTitle',
    description: 'guide.pairingDescription',
  },
] as const satisfies readonly { icon: IconName; title: string; description: string }[];

export function ConnectionGuideScreen() {
  const { t } = useAppTranslation();
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  return (
    <Screen>
      <View style={styles.intro}>
        <AppText variant="eyebrow" tone="accent">
          {t('guide.eyebrow')}
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          {t('guide.title')}
        </AppText>
        <AppText tone="secondary">{t('guide.description')}</AppText>
      </View>
      <View style={styles.steps}>
        {steps.map((step, index) => (
          <View key={step.title} style={styles.step}>
            <View style={styles.stepIcon}>
              <Icon name={step.icon} color={colors.accent} />
            </View>
            <View style={styles.stepCopy}>
              <AppText variant="eyebrow" tone="muted">
                0{index + 1}
              </AppText>
              <AppText variant="heading">{t(step.title)}</AppText>
              <AppText tone="secondary">{t(step.description)}</AppText>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.notice}>
        <Icon name="info.circle" color={colors.accent} size={20} />
        <AppText variant="caption" tone="secondary" style={styles.noticeText}>
          {t('guide.notice')}
        </AppText>
      </View>
      <ActionButton
        label={t('guide.tryPreview')}
        icon="arrow.right"
        onPress={() => router.replace('/preview')}
      />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    intro: { gap: spacing.lg, paddingTop: spacing.lg },
    steps: { gap: spacing.xxl, marginVertical: spacing.lg },
    step: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
    stepIcon: {
      width: 48,
      height: 48,
      borderRadius: radii.sm,
      backgroundColor: colors.accentSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepCopy: { flex: 1, gap: spacing.sm },
    notice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    noticeText: { flex: 1 },
  });
