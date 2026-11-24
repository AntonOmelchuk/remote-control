import { TIMER_MINUTES } from '@remote-control/remote-link/timer';
import { useMemo, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import type { ThemeColors } from '@/design-system/tokens';
import { useThemeStyles } from '@/design-system/use-theme';
import { useAppTranslation } from '@/localization/use-app-translation';
import { clampMinutes, DURATION_THUMB_SIZE, minutesAtPosition } from '../model/duration';

type Props = { value: number; onChange: (minutes: number) => void };
export function DurationSlider({ value, onChange }: Props) {
  const [width, setWidth] = useState(1);
  const { t, accessibilityLanguage } = useAppTranslation();
  const styles = useThemeStyles(createStyles);
  const responder = useMemo(() => {
    const gesture = { start: 0 };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        gesture.start = event.nativeEvent.locationX;
        onChange(minutesAtPosition(gesture.start, width));
      },
      onPanResponderMove: (_, state) =>
        onChange(minutesAtPosition(gesture.start + state.dx, width)),
      onPanResponderTerminationRequest: () => false,
    });
  }, [onChange, width]);
  const progress =
    (value - TIMER_MINUTES.minimum) / (TIMER_MINUTES.maximum - TIMER_MINUTES.minimum);
  return (
    <View
      {...responder.panHandlers}
      style={styles.target}
      onLayout={(event) => setWidth(Math.max(1, event.nativeEvent.layout.width))}
      accessible
      accessibilityRole="adjustable"
      accessibilityLanguage={accessibilityLanguage}
      accessibilityLabel={t('sleepTimer.durationLabel')}
      accessibilityHint={t('sleepTimer.sliderHint')}
      accessibilityValue={{
        min: TIMER_MINUTES.minimum,
        max: TIMER_MINUTES.maximum,
        now: value,
        text: t('sleepTimer.totalMinutes', { count: value }),
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        const action = event.nativeEvent.actionName;
        if (action === 'increment' || action === 'decrement')
          onChange(clampMinutes(value + (action === 'increment' ? 1 : -1)));
      }}
    >
      <View pointerEvents="none" style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      <View
        pointerEvents="none"
        style={[styles.thumb, { left: Math.max(0, (width - DURATION_THUMB_SIZE) * progress) }]}
      />
    </View>
  );
}
const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    target: { height: 48, justifyContent: 'center' },
    track: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.surfaceRaised,
      overflow: 'hidden',
    },
    fill: { height: '100%', backgroundColor: colors.accent },
    thumb: {
      position: 'absolute',
      width: DURATION_THUMB_SIZE,
      height: DURATION_THUMB_SIZE,
      borderRadius: DURATION_THUMB_SIZE / 2,
      backgroundColor: colors.accent,
      borderWidth: 3,
      borderColor: colors.surface,
    },
  });
