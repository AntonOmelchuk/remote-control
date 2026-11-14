import { router } from 'expo-router';
import { useReducer, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/ui/action-button';
import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import type { ThemeColors } from '@/design-system/tokens';
import { layout, radii, spacing } from '@/design-system/tokens';
import { useTheme, useThemeStyles } from '@/design-system/use-theme';
import { MediaCard } from '@/features/remote-preview/components/media-card';
import { TimerCard } from '@/features/remote-preview/components/timer-card';
import { TimerSheet } from '@/features/remote-preview/components/timer-sheet';
import { VolumeCard } from '@/features/remote-preview/components/volume-card';
import type { SleepTimerMinutes } from '@/features/remote-preview/model/preview-state';
import { createPreviewState, previewReducer } from '@/features/remote-preview/model/preview-state';
import { useAppTranslation } from '@/localization/use-app-translation';

export function PreviewScreen() {
  const { t, accessibilityLanguage } = useAppTranslation();
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const [state, dispatch] = useReducer(previewReducer, undefined, createPreviewState);
  const [isTimerOpen, setTimerOpen] = useState(false);

  function selectTimer(minutes: SleepTimerMinutes) {
    dispatch({ type: 'sleepTimerSelected', minutes });
    setTimerOpen(false);
  }

  return (
    <>
      <Screen accessibilityElementsHidden={isTimerOpen}>
        <View style={styles.deviceRow}>
          <View style={styles.deviceIcon}>
            <Icon name="laptopcomputer" color={colors.accent} size={27} />
          </View>
          <View style={styles.deviceCopy}>
            <AppText variant="eyebrow" tone="muted">
              {t('preview.deviceLabel')}
            </AppText>
            <AppText variant="heading">{t('preview.deviceName')}</AppText>
          </View>
          <View style={styles.badge}>
            <AppText variant="eyebrow" tone="accent">
              {t('preview.badge')}
            </AppText>
          </View>
        </View>
        <AppText tone="secondary">{t('preview.description')}</AppText>
        <MediaCard
          isPlaying={state.isPlaying}
          positionSeconds={state.positionSeconds}
          onTogglePlayback={() => dispatch({ type: 'playbackToggled' })}
          onSeek={(deltaSeconds) => dispatch({ type: 'seeked', deltaSeconds })}
        />
        <VolumeCard
          volume={state.volume}
          isMuted={state.isMuted}
          onChangeVolume={(delta) => dispatch({ type: 'volumeChanged', delta })}
          onToggleMute={() => dispatch({ type: 'muteToggled' })}
        />
        <TimerCard minutes={state.sleepTimerMinutes} onPress={() => setTimerOpen(true)} />
        <View style={styles.footer}>
          <AppText variant="caption" tone="muted" style={styles.note}>
            {t('preview.note')}
          </AppText>
          <Pressable
            accessibilityLanguage={accessibilityLanguage}
            accessibilityRole="button"
            onPress={() => dispatch({ type: 'reset' })}
            style={({ pressed }) => [styles.reset, pressed && styles.pressed]}
          >
            <Icon name="arrow.counterclockwise" color={colors.textSecondary} size={15} />
            <AppText variant="caption" tone="secondary">
              {t('preview.reset')}
            </AppText>
          </Pressable>
          <ActionButton
            label={t('preview.back')}
            variant="secondary"
            onPress={() => router.replace('/')}
          />
        </View>
      </Screen>
      <TimerSheet
        visible={isTimerOpen}
        selectedMinutes={state.sleepTimerMinutes}
        onSelect={selectTimer}
        onClose={() => setTimerOpen(false)}
      />
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    deviceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md },
    deviceIcon: {
      width: 48,
      height: 48,
      backgroundColor: colors.accentSurface,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deviceCopy: { flex: 1, minWidth: 125, gap: spacing.xs },
    badge: {
      borderWidth: 1,
      borderColor: colors.accentBorder,
      borderRadius: radii.pill,
      backgroundColor: colors.accentSurface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    footer: { gap: spacing.md },
    note: { textAlign: 'center' },
    reset: {
      minHeight: layout.minimumTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    pressed: { opacity: 0.7 },
  });
