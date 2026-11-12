import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/ui/action-button';
import { AppText } from '@/components/ui/app-text';
import type { IconName } from '@/components/ui/icon';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { colors, radii, spacing } from '@/design-system/tokens';

const steps = [
  {
    icon: 'laptopcomputer',
    title: 'A companion on your Mac',
    description:
      'The planned Mac companion will handle your controls and keep your devices in sync.',
  },
  {
    icon: 'wifi',
    title: 'One local network',
    description:
      'Your iPhone and Mac will communicate over your local network, without a cloud account.',
  },
  {
    icon: 'qrcode',
    title: 'Pair with a QR code',
    description:
      'Scan a pairing code, then confirm access on your Mac. Being on the same Wi-Fi will never grant access by itself.',
  },
] satisfies { icon: IconName; title: string; description: string }[];

export function ConnectionGuideScreen() {
  return (
    <Screen>
      <View style={styles.intro}>
        <AppText variant="eyebrow" tone="accent">
          MADE FOR YOUR OWN SPACE
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          {'A simple connection.\nA little peace of mind.'}
        </AppText>
        <AppText tone="secondary">Here is how connecting your devices is planned to work.</AppText>
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
              <AppText variant="heading">{step.title}</AppText>
              <AppText tone="secondary">{step.description}</AppText>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.notice}>
        <Icon name="info.circle" color={colors.accent} size={20} />
        <AppText variant="caption" tone="secondary" style={styles.noticeText}>
          Mac pairing is not available in this preview. You can explore the controls without
          connecting a device.
        </AppText>
      </View>
      <ActionButton
        label="Try the preview"
        icon="arrow.right"
        onPress={() => router.replace('/preview')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
