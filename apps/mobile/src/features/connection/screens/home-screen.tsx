import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/ui/action-button';
import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Screen } from '@/components/ui/screen';
import type { ThemeColors } from '@/design-system/tokens';
import { radii, spacing } from '@/design-system/tokens';
import { useTheme, useThemeStyles } from '@/design-system/use-theme';
import { MacIllustration } from '@/features/connection/components/mac-illustration';
import { useAppTranslation } from '@/localization/use-app-translation';

export function HomeScreen() {
  const { t } = useAppTranslation();
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  return (
    <Screen insetTop>
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <Icon name="wave.3.right" color={colors.accent} size={19} />
          </View>
          <AppText variant="eyebrow" style={styles.brandText}>
            {t('common.brand')}
          </AppText>
        </View>
        <View style={styles.headerActions}>
          <IconButton
            icon="info"
            label={t('common.connectionGuide')}
            onPress={() => router.push('/connection-guide')}
          />
          <IconButton
            icon="gearshape"
            label={t('common.settings')}
            onPress={() => router.push('/settings')}
          />
        </View>
      </View>
      <View style={styles.introduction}>
        <AppText variant="eyebrow" tone="accent">
          {t('home.eyebrow')}
        </AppText>
        <AppText variant="hero" accessibilityRole="header">
          {t('home.title')}
        </AppText>
        <AppText tone="secondary" style={styles.description}>
          {t('home.description')}
        </AppText>
      </View>
      <MacIllustration />
      <View style={styles.deviceCard}>
        <View style={styles.deviceIcon}>
          <Icon name="laptopcomputer" size={25} color={colors.textSecondary} />
        </View>
        <View style={styles.deviceCopy}>
          <AppText variant="label">{t('home.deviceTitle')}</AppText>
          <AppText variant="caption" tone="secondary">
            {t('home.deviceDescription')}
          </AppText>
        </View>
        <View style={styles.statusDot} />
      </View>
      <View style={styles.actions}>
        <ActionButton label={t('remoteAudio.open')} onPress={() => router.push('/remote')} />
        <ActionButton label={t('pairing.scan')} onPress={() => router.push('/pair')} />
        <ActionButton
          label={t('home.explore')}
          icon="arrow.up.right"
          onPress={() => router.push('/preview')}
        />
        <AppText variant="caption" tone="muted" style={styles.footnote}>
          {t('home.footnote')}
        </AppText>
      </View>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    headerActions: { flexDirection: 'row', gap: spacing.xs },
    brandText: { flexShrink: 1 },
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
