import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { colors, radii, spacing } from '@/design-system/tokens';
import { formatPlaybackTime, previewMedia } from '@/features/remote-preview/model/preview-state';

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
  const progress = (positionSeconds / previewMedia.durationSeconds) * 100;
  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Icon name="play.rectangle" size={18} color={colors.textSecondary} />
        <AppText variant="eyebrow" tone="secondary">
          SAMPLE MEDIA
        </AppText>
      </View>
      <View style={styles.media}>
        <View style={styles.artwork} accessibilityElementsHidden>
          <View style={styles.artworkDisc} />
          <Icon name="waveform" size={35} color={colors.accent} />
        </View>
        <View style={styles.mediaCopy}>
          <AppText variant="heading">{previewMedia.title}</AppText>
          <AppText variant="caption" tone="secondary">
            {previewMedia.source} · Demo video
          </AppText>
        </View>
      </View>
      <View style={styles.progressGroup}>
        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityLabel="Preview playback position"
          accessibilityValue={{
            min: 0,
            max: previewMedia.durationSeconds,
            now: positionSeconds,
            text: `${formatPlaybackTime(positionSeconds)} of ${formatPlaybackTime(previewMedia.durationSeconds)}`,
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
          label="Seek backward 15 seconds in preview"
          onPress={() => onSeek(-15)}
          disabled={positionSeconds === 0}
        />
        <IconButton
          icon={isPlaying ? 'pause.fill' : 'play.fill'}
          label={isPlaying ? 'Pause preview' : 'Play preview'}
          onPress={onTogglePlayback}
          emphasis
          size={76}
        />
        <IconButton
          icon="goforward.15"
          label="Seek forward 15 seconds in preview"
          onPress={() => onSeek(15)}
          disabled={positionSeconds === previewMedia.durationSeconds}
        />
      </View>
      <AppText variant="caption" tone="muted" style={styles.previewNote}>
        {isPlaying ? 'Playing state · preview only' : 'Paused state · preview only'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: '#35472B',
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
    borderColor: '#435B34',
    left: -35,
    top: 20,
  },
  mediaCopy: { flex: 1, gap: spacing.xs },
  progressGroup: { gap: spacing.sm },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
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
