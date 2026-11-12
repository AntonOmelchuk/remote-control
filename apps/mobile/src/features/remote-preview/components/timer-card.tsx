import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { colors, radii, spacing } from '@/design-system/tokens';
import type { SleepTimerMinutes } from '@/features/remote-preview/model/preview-state';
import { formatSleepTimer } from '@/features/remote-preview/model/preview-state';

type TimerCardProps = { minutes: SleepTimerMinutes; onPress: () => void };

export function TimerCard({ minutes, onPress }: TimerCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Sleep timer preview, ${formatSleepTimer(minutes)}`}
      accessibilityHint="Opens the timer preset picker"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Icon name="moon" color={colors.accent} />
      </View>
      <View style={styles.copy}>
        <AppText variant="label">Sleep timer</AppText>
        <AppText variant="caption" tone="muted">
          {minutes === null ? 'Choose a preset' : 'Preset selected · no countdown'}
        </AppText>
      </View>
      <AppText variant="label" tone="accent">
        {formatSleepTimer(minutes)}
      </AppText>
      <Icon name="chevron.right" size={13} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
