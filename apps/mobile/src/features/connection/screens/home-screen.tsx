import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/ui/action-button';
import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Screen } from '@/components/ui/screen';
import { colors, radii, spacing } from '@/design-system/tokens';
import { MacIllustration } from '@/features/connection/components/mac-illustration';

export function HomeScreen() {
  return (
    <Screen insetTop>
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <Icon name="wave.3.right" color={colors.accent} size={19} />
          </View>
          <AppText variant="eyebrow">REMOTE CONTROL</AppText>
        </View>
        <IconButton
          icon="info"
          label="Connection guide"
          onPress={() => router.push('/connection-guide')}
        />
      </View>
      <View style={styles.introduction}>
        <AppText variant="eyebrow" tone="accent">
          LESS REACHING. MORE RELAXING.
        </AppText>
        <AppText variant="hero" accessibilityRole="header">
          {'Your Mac.\nWithin reach.'}
        </AppText>
        <AppText tone="secondary" style={styles.description}>
          Settle in. Your favorite controls belong right here, in your hand.
        </AppText>
      </View>
      <MacIllustration />
      <View style={styles.deviceCard}>
        <View style={styles.deviceIcon}>
          <Icon name="laptopcomputer" size={25} color={colors.textSecondary} />
        </View>
        <View style={styles.deviceCopy}>
          <AppText variant="label">No Mac connected</AppText>
          <AppText variant="caption" tone="secondary">
            Your remote starts with a connection.
          </AppText>
        </View>
        <View style={styles.statusDot} />
      </View>
      <View style={styles.actions}>
        <ActionButton
          label="Explore the remote"
          icon="arrow.up.right"
          onPress={() => router.push('/preview')}
        />
        <AppText variant="caption" tone="muted" style={styles.footnote}>
          Try the interactive preview. No Mac required.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introduction: { gap: spacing.lg, marginTop: spacing.sm },
  description: { maxWidth: 320 },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  deviceCopy: { flex: 1, gap: spacing.xs },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.textMuted },
  actions: { gap: spacing.md, marginTop: 'auto', paddingTop: spacing.sm },
  footnote: { textAlign: 'center', marginTop: spacing.xs },
});
