import { router } from 'expo-router';
import { useReducer, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/ui/action-button';
import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { colors, layout, radii, spacing } from '@/design-system/tokens';
import { MediaCard } from '@/features/remote-preview/components/media-card';
import { TimerCard } from '@/features/remote-preview/components/timer-card';
import { TimerSheet } from '@/features/remote-preview/components/timer-sheet';
import { VolumeCard } from '@/features/remote-preview/components/volume-card';
import type { SleepTimerMinutes } from '@/features/remote-preview/model/preview-state';
import { createPreviewState, previewReducer } from '@/features/remote-preview/model/preview-state';

export function PreviewScreen() {
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
              DEMO DEVICE
            </AppText>
            <AppText variant="heading">Sample MacBook</AppText>
          </View>
          <View style={styles.badge}>
            <AppText variant="eyebrow" tone="accent">
              PREVIEW
            </AppText>
          </View>
        </View>
        <AppText tone="secondary">Make yourself comfortable.</AppText>
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
            Preview changes stay on this iPhone. No media plays, no timer runs, and no commands are
            sent to a Mac.
          </AppText>
          <Pressable
            accessibilityRole="button"
            onPress={() => dispatch({ type: 'reset' })}
            style={({ pressed }) => [styles.reset, pressed && styles.pressed]}
          >
            <Icon name="arrow.counterclockwise" color={colors.textSecondary} size={15} />
            <AppText variant="caption" tone="secondary">
              Reset preview
            </AppText>
          </Pressable>
          <ActionButton
            label="Back to devices"
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

const styles = StyleSheet.create({
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
    borderColor: '#4B5B3D',
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
