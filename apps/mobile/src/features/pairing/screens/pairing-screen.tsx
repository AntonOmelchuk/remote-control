import { lazy, Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/ui/action-button';
import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import type { ThemeColors } from '@/design-system/tokens';
import { radii, spacing } from '@/design-system/tokens';
import { useTheme, useThemeStyles } from '@/design-system/use-theme';
import { usePairing } from '@/features/pairing/model/use-pairing';
import { useAppTranslation } from '@/localization/use-app-translation';

const PairingScanner = lazy(() => import('../components/pairing-scanner'));

export function PairingScreen() {
  const { t } = useAppTranslation();
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const pairing = usePairing();
  const pending = pairing.phase === 'waiting' || pairing.phase === 'verifying';

  return (
    <Screen>
      <AppText variant="eyebrow" tone="accent">
        {t('pairing.eyebrow')}
      </AppText>
      <AppText variant="hero">{t('pairing.title')}</AppText>
      <AppText tone="secondary">{t('pairing.description')}</AppText>
      {!pairing.available ? (
        <AppText tone="secondary">{t('pairing.buildRequired')}</AppText>
      ) : (
        <>
          {pairing.phase === 'scanning' ? (
            <Suspense fallback={<ActivityIndicator color={colors.accent} />}>
              <PairingScanner
                onScan={(code) => {
                  void pairing.scan(code);
                }}
                onError={pairing.cameraFailed}
              />
            </Suspense>
          ) : null}
          {pairing.preparation && pairing.phase === 'waiting' ? (
            <View style={styles.card}>
              <AppText variant="label">{t('pairing.compare')}</AppText>
              <AppText variant="hero" style={styles.code}>
                {pairing.preparation.comparison}
              </AppText>
              <AppText tone="secondary">{t('pairing.confirmOnMac')}</AppText>
            </View>
          ) : null}
          {pending ? (
            <ActivityIndicator color={colors.accent} accessibilityLabel={t('pairing.waiting')} />
          ) : null}
          {pairing.phase === 'paired' || pairing.phase === 'verified' ? (
            <AppText tone="accent" accessibilityLiveRegion="polite">
              {t(pairing.phase === 'paired' ? 'pairing.success' : 'pairing.verified')}
            </AppText>
          ) : null}
          {pairing.phase === 'error' ? (
            <AppText accessibilityRole="alert">{t('pairing.error')}</AppText>
          ) : null}
          {pairing.saved ? (
            <View style={styles.card}>
              <AppText variant="label">{pairing.saved.name}</AppText>
              <AppText variant="caption" tone="secondary">
                {t('pairing.savedNote')}
              </AppText>
              <ActionButton
                label={t('pairing.verify')}
                disabled={pending}
                onPress={() => {
                  void pairing.verify();
                }}
              />
              <ActionButton
                label={t('pairing.forget')}
                variant="secondary"
                disabled={pending}
                onPress={() => {
                  void pairing.forget();
                }}
              />
            </View>
          ) : null}
          {pending || pairing.phase === 'scanning' ? (
            <ActionButton
              label={t('pairing.cancel')}
              variant="secondary"
              onPress={pairing.cancel}
            />
          ) : (
            <ActionButton label={t('pairing.scan')} onPress={pairing.startScan} />
          )}
        </>
      )}
      <AppText variant="caption" tone="muted">
        {t('pairing.scope')}
      </AppText>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      padding: spacing.lg,
      gap: spacing.md,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
    },
    code: { textAlign: 'center', fontVariant: ['tabular-nums'], letterSpacing: 5 },
  });
