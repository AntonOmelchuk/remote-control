import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import type { ThemeColors } from '@/design-system/tokens';
import { radii, spacing } from '@/design-system/tokens';
import { useTheme, useThemeStyles } from '@/design-system/use-theme';
import { previewMedia } from '@/features/remote-preview/model/preview-state';
import { formatPlaybackTime } from '@/shared/format-time';
import { useAppTranslation } from '@/localization/use-app-translation';

type MediaCardProps = {
  isPlaying: boolean;
  positionSeconds: number;
  onTogglePlayback: () => void;
  onSeek: (deltaSeconds: number) => void;
};

export function MediaCard({
  isPlaying,
  positionSeconds,
  onTogglePlayback,
  onSeek,
}: MediaCardProps) {
  const { t, accessibilityLanguage } = useAppTranslation();
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const progress = (positionSeconds / previewMedia.durationSeconds) * 100;
  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Icon name="play.rectangle" size={18} color={colors.textSecondary} />
        <AppText variant="eyebrow" tone="secondary">
          {t('media.label')}
        </AppText>
      </View>
      <View style={styles.media}>
        <View style={styles.artwork} accessibilityElementsHidden>
          <View style={styles.artworkDisc} />
          <Icon name="waveform" size={35} color={colors.accent} />
        </View>
        <View style={styles.mediaCopy}>
          <AppText variant="heading">{t('media.title')}</AppText>
          <AppText variant="caption" tone="secondary">
            {t('media.subtitle', { source: previewMedia.source })}
          </AppText>
        </View>
      </View>
      <View style={styles.progressGroup}>
        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityLabel={t('media.positionLabel')}
          accessibilityLanguage={accessibilityLanguage}
          accessibilityValue={{
            min: 0,
            max: previewMedia.durationSeconds,
            now: positionSeconds,
            text: t('media.positionValue', {
              position: formatPlaybackTime(positionSeconds),
              duration: formatPlaybackTime(previewMedia.durationSeconds),
            }),
          }}
        >
          <View style={[styles.progress, { width: `${progress}%` }]} />
        </View>
        <View style={styles.timestamps}>
          <AppText variant="caption" tone="secondary" style={styles.timestamp}>
            {formatPlaybackTime(positionSeconds)}
          </AppText>
          <AppText variant="caption" tone="muted" style={styles.timestamp}>
            {formatPlaybackTime(previewMedia.durationSeconds)}
          </AppText>
        </View>
      </View>
      <View style={styles.controls}>
        <IconButton
          icon="gobackward.15"
          label={t('media.backward')}
          onPress={() => onSeek(-15)}
          disabled={positionSeconds === 0}
        />
        <IconButton
          icon={isPlaying ? 'pause.fill' : 'play.fill'}
          label={t(isPlaying ? 'media.pause' : 'media.play')}
          onPress={onTogglePlayback}
          emphasis
          size={76}
        />
        <IconButton
          icon="goforward.15"
          label={t('media.forward')}
          onPress={() => onSeek(15)}
          disabled={positionSeconds === previewMedia.durationSeconds}
        />
      </View>
      <AppText variant="caption" tone="muted" style={styles.previewNote}>
        {t(isPlaying ? 'media.playing' : 'media.paused')}
      </AppText>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      padding: spacing.xl,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.xl,
    },
    heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    media: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    artwork: {
      width: 76,
      height: 76,
      backgroundColor: colors.artwork,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    artworkDisc: {
      position: 'absolute',
      width: 95,
      height: 95,
      borderRadius: 50,
      borderWidth: 16,
      borderColor: colors.artworkDisc,
      left: -35,
      top: 20,
    },
    mediaCopy: { flex: 1, gap: spacing.xs },
    progressGroup: { gap: spacing.sm },
    track: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.surfaceRaised,
      overflow: 'hidden',
    },
    progress: { height: '100%', backgroundColor: colors.accent, borderRadius: 2 },
    timestamps: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
    timestamp: { fontVariant: ['tabular-nums'] },
    controls: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.xl,
    },
    previewNote: { textAlign: 'center', marginTop: -spacing.sm },
  });
