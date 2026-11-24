import { TIMER_MINUTES, timerIsActive } from '@remote-control/remote-link/timer';
import type { SleepTimerSnapshot, TimerFailure } from '@remote-control/remote-link/timer';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActionButton } from '@/components/ui/action-button';
import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import type { ThemeColors } from '@/design-system/tokens';
import { radii, spacing } from '@/design-system/tokens';
import { useTheme, useThemeStyles } from '@/design-system/use-theme';
import { useAppTranslation } from '@/localization/use-app-translation';
import { formatPlaybackTime } from '@/shared/format-time';
import { SleepTimerSheet } from './sleep-timer-sheet';

type Props = {
  timer: SleepTimerSnapshot | null;
  selectionID: string | null;
  playerReady: boolean;
  available: boolean;
  writing: boolean;
  failure: TimerFailure | null;
  onStart: (selectionID: string, minutes: number, expectedID: string | null) => Promise<void>;
  onCancel: (timerID: string) => Promise<void>;
};
type Editor = { selectionID: string; expectedID: string | null; minutes: number };
export function SleepTimerCard({
  timer,
  selectionID,
  playerReady,
  available,
  writing,
  failure,
  onStart,
  onCancel,
}: Props) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const { t } = useAppTranslation();
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const supported = available && timer !== null;
  const active = timer !== null && timerIsActive(timer);
  const canStart = supported && selectionID !== null && playerReady;
  const stale =
    editor !== null && (editor.selectionID !== selectionID || editor.expectedID !== timer?.id);
  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Icon name="moon" color={colors.accent} />
        <AppText variant="label">{t('sleepTimer.title')}</AppText>
      </View>
      {active && timer ? (
        <AppText variant="hero" tone="accent" style={styles.digits}>
          {formatPlaybackTime(timer.remainingSeconds)}
        </AppText>
      ) : null}
      <AppText tone={active ? 'accent' : 'secondary'}>
        {t(`sleepTimer.state.${timer?.phase ?? 'idle'}`)}
      </AppText>
      {timer?.cancellation ? (
        <AppText variant="caption" tone="secondary">
          {t(`sleepTimer.cancelled.${timer.cancellation}`)}
        </AppText>
      ) : null}
      {timer?.failure ? (
        <AppText accessibilityRole="alert">{t(`sleepTimer.failure.${timer.failure}`)}</AppText>
      ) : null}
      {!available ? (
        <AppText tone="secondary">{t('sleepTimer.buildRequired')}</AppText>
      ) : !timer ? (
        <AppText tone="secondary">{t('sleepTimer.macRequired')}</AppText>
      ) : !canStart ? (
        <AppText variant="caption" tone="secondary">
          {t('sleepTimer.selectVideo')}
        </AppText>
      ) : null}
      {supported ? (
        <ActionButton
          label={t(active ? 'sleepTimer.change' : 'sleepTimer.choose')}
          variant="secondary"
          disabled={!canStart || writing}
          onPress={() => {
            if (selectionID)
              setEditor({
                selectionID,
                expectedID: timer?.id ?? null,
                minutes: timer?.durationSeconds
                  ? timer.durationSeconds / 60
                  : TIMER_MINUTES.default,
              });
          }}
        />
      ) : null}
      {active && timer?.id ? (
        <ActionButton
          label={t('sleepTimer.cancel')}
          variant="secondary"
          disabled={writing}
          onPress={() => {
            if (timer.id) void onCancel(timer.id);
          }}
        />
      ) : null}
      {failure ? (
        <AppText accessibilityRole="alert">{t(`sleepTimer.failure.${failure}`)}</AppText>
      ) : null}
      <AppText variant="caption" tone="muted">
        {t('sleepTimer.phoneIndependent')}
      </AppText>
      {editor ? (
        <SleepTimerSheet
          initialMinutes={editor.minutes}
          disabled={writing || !canStart}
          stale={stale}
          replacing={active}
          onApply={(minutes) => onStart(editor.selectionID, minutes, editor.expectedID)}
          onClose={() => setEditor(null)}
        />
      ) : null}
    </View>
  );
}
const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      padding: spacing.xl,
      gap: spacing.lg,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
    },
    heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    digits: { fontVariant: ['tabular-nums'] },
  });
