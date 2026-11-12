import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { colors, layout, radii, spacing } from '@/design-system/tokens';
import type { SleepTimerMinutes } from '@/features/remote-preview/model/preview-state';
import { formatSleepTimer, sleepTimerOptions } from '@/features/remote-preview/model/preview-state';

type TimerSheetProps = {
  visible: boolean;
  selectedMinutes: SleepTimerMinutes;
  onSelect: (minutes: SleepTimerMinutes) => void;
  onClose: () => void;
};

export function TimerSheet({ visible, selectedMinutes, onSelect, onClose }: TimerSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
        <View style={styles.sheet} accessibilityViewIsModal onAccessibilityEscape={onClose}>
          <SafeAreaView edges={['bottom']} style={styles.safeArea}>
            <ScrollView bounces={false} contentContainerStyle={styles.content}>
              <View style={styles.heading}>
                <View style={styles.titleCopy}>
                  <AppText variant="eyebrow" tone="accent">
                    PREVIEW PRESET
                  </AppText>
                  <AppText variant="title" accessibilityRole="header">
                    Sleep timer
                  </AppText>
                </View>
                <IconButton icon="xmark" label="Close timer picker" onPress={onClose} />
              </View>
              <AppText tone="secondary">
                Choose a preset to try the interface. No countdown will run.
              </AppText>
              <View style={styles.options}>
                {sleepTimerOptions.map((minutes) => (
                  <Pressable
                    key={minutes ?? 'off'}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: minutes === selectedMinutes }}
                    accessibilityLabel={minutes === null ? 'Timer off' : `${minutes} minutes`}
                    onPress={() => onSelect(minutes)}
                    style={({ pressed }) => [
                      styles.option,
                      minutes === selectedMinutes && styles.selected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <AppText variant="label">{formatSleepTimer(minutes)}</AppText>
                    {minutes === selectedMinutes ? (
                      <Icon name="checkmark" size={18} color={colors.accent} />
                    ) : null}
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    maxHeight: '90%',
    width: '100%',
    maxWidth: layout.contentWidth,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  safeArea: { flexShrink: 1 },
  content: { padding: spacing.xl, gap: spacing.xl },
  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.lg,
  },
  titleCopy: { flex: 1, gap: spacing.sm },
  options: { gap: spacing.sm },
  option: {
    minHeight: 56,
    padding: spacing.lg,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  selected: { backgroundColor: colors.accentSurface },
  pressed: { opacity: 0.7 },
});
