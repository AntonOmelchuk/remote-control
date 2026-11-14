import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { IconButton } from '@/components/ui/icon-button';
import type { ThemeColors } from '@/design-system/tokens';
import { radii, spacing } from '@/design-system/tokens';
import { useThemeStyles } from '@/design-system/use-theme';
import { useAppTranslation } from '@/localization/use-app-translation';

type VolumeCardProps = {
  volume: number;
  isMuted: boolean;
  onChangeVolume: (delta: number) => void;
  onToggleMute: () => void;
};

export function VolumeCard({ volume, isMuted, onChangeVolume, onToggleMute }: VolumeCardProps) {
  const { t, accessibilityLanguage } = useAppTranslation();
  const styles = useThemeStyles(createStyles);
  const effectiveVolume = isMuted ? 0 : volume;
  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.valueGroup}>
          <AppText variant="label" tone="secondary">
            {t('volume.title')}
          </AppText>
          <View style={styles.numberRow}>
            <AppText variant="number">{effectiveVolume}</AppText>
            <AppText variant="label" tone="muted" style={styles.unit}>
              %
            </AppText>
          </View>
        </View>
        <IconButton
          icon={isMuted ? 'speaker.slash.fill' : 'speaker.wave.2.fill'}
          label={t(isMuted ? 'volume.unmute' : 'volume.mute')}
          selected={isMuted}
          onPress={onToggleMute}
        />
      </View>
      <View
        style={styles.bar}
        accessibilityRole="progressbar"
        accessibilityLabel={t('volume.label')}
        accessibilityLanguage={accessibilityLanguage}
        accessibilityValue={{
          min: 0,
          max: 100,
          now: effectiveVolume,
          text: isMuted ? t('volume.muted') : t('volume.value', { volume }),
        }}
      >
        <View style={[styles.fill, { width: `${effectiveVolume}%` }]} />
      </View>
      <View style={styles.adjustments}>
        <IconButton
          icon="minus"
          label={t('volume.decrease')}
          onPress={() => onChangeVolume(-5)}
          disabled={volume === 0}
        />
        <AppText variant="caption" tone="muted" style={styles.hint}>
          {isMuted ? t('volume.saved', { volume }) : t('volume.hint')}
        </AppText>
        <IconButton
          icon="plus"
          label={t('volume.increase')}
          onPress={() => onChangeVolume(5)}
          disabled={volume === 100}
        />
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      padding: spacing.xl,
      gap: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    heading: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.lg,
    },
    valueGroup: { flex: 1, gap: spacing.xs },
    numberRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
    unit: { marginLeft: spacing.xs },
    bar: {
      height: 12,
      backgroundColor: colors.surfaceRaised,
      borderRadius: radii.pill,
      overflow: 'hidden',
    },
    fill: { height: '100%', backgroundColor: colors.accent, borderRadius: radii.pill },
    adjustments: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    hint: { flex: 1, textAlign: 'center' },
  });
