import { TIMER_MINUTES, TIMER_PRESETS } from '@remote-control/remote-link/timer';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton } from '@/components/ui/action-button';
import { AppText } from '@/components/ui/app-text';
import { IconButton } from '@/components/ui/icon-button';
import type { ThemeColors } from '@/design-system/tokens';
import { layout, radii, spacing } from '@/design-system/tokens';
import { useThemeStyles } from '@/design-system/use-theme';
import { useAppTranslation } from '@/localization/use-app-translation';
import { clampMinutes, durationParts } from '../model/duration';
import { DurationSlider } from './duration-slider';

type Props = {
  initialMinutes: number;
  disabled: boolean;
  stale: boolean;
  replacing: boolean;
  onApply: (minutes: number) => Promise<void>;
  onClose: () => void;
};
export function SleepTimerSheet({
  initialMinutes,
  disabled,
  stale,
  replacing,
  onApply,
  onClose,
}: Props) {
  const [minutes, setMinutes] = useState(clampMinutes(initialMinutes));
  const { t, accessibilityLanguage } = useAppTranslation();
  const styles = useThemeStyles(createStyles);
  const parts = durationParts(minutes);
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
        <View style={styles.sheet} accessibilityViewIsModal onAccessibilityEscape={onClose}>
          <SafeAreaView edges={['bottom']} style={styles.safeArea}>
            <ScrollView bounces={false} contentContainerStyle={styles.content}>
              <View style={styles.heading}>
                <AppText variant="title" accessibilityRole="header">
                  {t('sleepTimer.title')}
                </AppText>
                <IconButton
                  icon="xmark"
                  label={t('sleepTimer.close')}
                  onPress={onClose}
                  size={44}
                />
              </View>
              <AppText tone="secondary">{t('sleepTimer.description')}</AppText>
              <View style={styles.duration}>
                <AppText variant="hero" tone="accent" style={styles.digits}>
                  {String(parts.hours).padStart(2, '0')}:{String(parts.minutes).padStart(2, '0')}
                </AppText>
                <AppText variant="caption" tone="secondary">
                  {t('sleepTimer.hoursMinutes')}
                </AppText>
              </View>
              <DurationSlider value={minutes} onChange={setMinutes} />
              <View style={styles.limits}>
                <AppText variant="caption" tone="muted">
                  {t('sleepTimer.minimum')}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {t('sleepTimer.maximum')}
                </AppText>
              </View>
              <View style={styles.adjust}>
                <IconButton
                  icon="minus"
                  label={t('sleepTimer.decrease')}
                  size={48}
                  onPress={() => setMinutes((value) => clampMinutes(value - 1))}
                  disabled={minutes === TIMER_MINUTES.minimum}
                />
                <AppText variant="caption" tone="secondary">
                  {t('sleepTimer.precision')}
                </AppText>
                <IconButton
                  icon="plus"
                  label={t('sleepTimer.increase')}
                  size={48}
                  onPress={() => setMinutes((value) => clampMinutes(value + 1))}
                  disabled={minutes === TIMER_MINUTES.maximum}
                />
              </View>
              <View style={styles.presets}>
                {TIMER_PRESETS.map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityLanguage={accessibilityLanguage}
                    accessibilityState={{ checked: value === minutes }}
                    onPress={() => setMinutes(value)}
                    style={[styles.preset, value === minutes && styles.selected]}
                  >
                    <AppText variant="caption">
                      {t('sleepTimer.totalMinutes', { count: value })}
                    </AppText>
                  </Pressable>
                ))}
              </View>
              {stale ? (
                <AppText accessibilityRole="alert">{t('sleepTimer.editorChanged')}</AppText>
              ) : null}
              <ActionButton
                label={t(replacing ? 'sleepTimer.replace' : 'sleepTimer.start')}
                disabled={disabled || stale}
                onPress={() => {
                  void onApply(minutes).then(onClose);
                }}
              />
              <AppText variant="caption" tone="muted">
                {t('sleepTimer.phoneIndependent')}
              </AppText>
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}
const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    sheet: {
      maxHeight: '92%',
      width: '100%',
      maxWidth: layout.contentWidth,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    safeArea: { flexShrink: 1 },
    content: { padding: spacing.xl, gap: spacing.lg },
    heading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    duration: { alignItems: 'center', gap: spacing.xs },
    digits: { fontVariant: ['tabular-nums'] },
    limits: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -spacing.lg },
    adjust: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    preset: { padding: spacing.md, borderRadius: radii.sm, backgroundColor: colors.surfaceRaised },
    selected: {
      backgroundColor: colors.accentSurface,
      borderColor: colors.accentBorder,
      borderWidth: 1,
    },
  });
