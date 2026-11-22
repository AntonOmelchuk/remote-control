import { useMemo, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import type { ThemeColors } from '@/design-system/tokens';
import { radii } from '@/design-system/tokens';
import { useThemeStyles } from '@/design-system/use-theme';
import { useAppTranslation } from '@/localization/use-app-translation';

import { formatVolume, stepVolume, volumeAtPosition, VOLUME_THUMB_SIZE } from '../model/volume';

type Props = {
  value: number;
  draft: number | null;
  disabled: boolean;
  onDraftChange: (value: number | null) => void;
  onCommit: (value: number) => Promise<void>;
};

export function VolumeSlider({ value, draft, disabled, onDraftChange, onCommit }: Props) {
  const { t, accessibilityLanguage } = useAppTranslation();
  const styles = useThemeStyles(createStyles);
  const [width, setWidth] = useState(1);
  const responder = useMemo(() => {
    const gesture = { start: 0, value: 0 };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: (event) => {
        gesture.start = event.nativeEvent.locationX;
        gesture.value = volumeAtPosition(gesture.start, width);
        onDraftChange(gesture.value);
      },
      onPanResponderMove: (_, state) => {
        gesture.value = volumeAtPosition(gesture.start + state.dx, width);
        onDraftChange(gesture.value);
      },
      onPanResponderRelease: () => {
        void onCommit(gesture.value).finally(() => onDraftChange(null));
      },
      onPanResponderTerminate: () => onDraftChange(null),
      onPanResponderTerminationRequest: () => false,
    });
  }, [disabled, onCommit, onDraftChange, width]);
  const visible = draft ?? value;
  return (
    <View
      {...responder.panHandlers}
      style={styles.target}
      onLayout={(event) => setWidth(Math.max(1, event.nativeEvent.layout.width))}
      accessible
      accessibilityRole="adjustable"
      accessibilityLanguage={accessibilityLanguage}
      accessibilityLabel={t('remoteAudio.volume')}
      accessibilityHint={t('remoteAudio.sliderHint')}
      accessibilityState={{ disabled }}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(visible * 100),
        text: formatVolume(visible),
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (disabled) return;
        const name = event.nativeEvent.actionName;
        if (name !== 'increment' && name !== 'decrement') return;
        void onCommit(stepVolume(value, name === 'increment' ? 1 : -1));
      }}
    >
      <View pointerEvents="none" style={styles.track}>
        <View style={[styles.fill, { width: `${visible * 100}%` }]} />
      </View>
      <View
        pointerEvents="none"
        style={[styles.thumb, { left: Math.max(0, (width - VOLUME_THUMB_SIZE) * visible) }]}
      />
    </View>
  );
}
const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    target: { height: 48, justifyContent: 'center' },
    track: {
      height: 12,
      backgroundColor: colors.surfaceRaised,
      borderRadius: radii.pill,
      overflow: 'hidden',
    },
    fill: { height: '100%', backgroundColor: colors.accent, borderRadius: radii.pill },
    thumb: {
      position: 'absolute',
      width: VOLUME_THUMB_SIZE,
      height: VOLUME_THUMB_SIZE,
      borderRadius: VOLUME_THUMB_SIZE / 2,
      backgroundColor: colors.accent,
      borderWidth: 3,
      borderColor: colors.surface,
    },
  });
