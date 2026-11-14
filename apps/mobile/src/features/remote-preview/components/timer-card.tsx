import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import type { ThemeColors } from '@/design-system/tokens';
import { radii, spacing } from '@/design-system/tokens';
import { useTheme, useThemeStyles } from '@/design-system/use-theme';
import type { SleepTimerMinutes } from '@/features/remote-preview/model/preview-state';
import { useAppTranslation } from '@/localization/use-app-translation';

type TimerCardProps = { minutes: SleepTimerMinutes; onPress: () => void };

export function TimerCard({ minutes, onPress }: TimerCardProps) {
  const { t, accessibilityLanguage } = useAppTranslation();
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const label = minutes === null ? t('common.off') : t('time.minutesShort', { count: minutes });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('timer.label', { duration: label })}
      accessibilityLanguage={accessibilityLanguage}
      accessibilityHint={t('timer.hint')}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Icon name="moon" color={colors.accent} />
      </View>
      <View style={styles.copy}>
        <AppText variant="label">{t('timer.title')}</AppText>
        <AppText variant="caption" tone="muted">
          {t(minutes === null ? 'timer.choose' : 'timer.selected')}
        </AppText>
      </View>
      <AppText variant="label" tone="accent">
        {label}
      </AppText>
      <Icon name="chevron.right" size={13} color={colors.textMuted} />
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.md,
      padding: spacing.xl,
      minHeight: 88,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    icon: {
      width: 42,
      height: 42,
      backgroundColor: colors.accentSurface,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: { flex: 1, minWidth: 110, gap: spacing.xs },
    pressed: { opacity: 0.75 },
  });
