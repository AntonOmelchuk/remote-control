import type { MediaFailure, YouTubeSnapshot } from '@remote-control/remote-link/media';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import type { ThemeColors } from '@/design-system/tokens';
import { radii, spacing } from '@/design-system/tokens';
import { useTheme, useThemeStyles } from '@/design-system/use-theme';
import { useAppTranslation } from '@/localization/use-app-translation';
import { formatPlaybackTime } from '@/shared/format-time';

type Props = {
  snapshot: YouTubeSnapshot | null;
  failure: MediaFailure | null;
  available: boolean;
  writing: boolean;
  onSetPaused: (targetID: string, paused: boolean) => Promise<void>;
};

export function YouTubeCard({ snapshot, failure, available, writing, onSetPaused }: Props) {
  const { t } = useAppTranslation();
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const media = snapshot && 'targetID' in snapshot ? snapshot : null;
  const ready = available && media?.availability === 'ready';
  const progress = media?.duration ? Math.min(100, (media.position / media.duration) * 100) : 0;
  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Icon name="play.rectangle" color={colors.accent} />
        <AppText variant="eyebrow">YouTube</AppText>
      </View>
      {media ? <AppText variant="heading">{media.title}</AppText> : null}
      {media ? (
        <>
          <View style={styles.track} accessibilityElementsHidden>
            <View style={[styles.progress, { width: `${progress}%` }]} />
          </View>
          <View style={styles.times}>
            <AppText variant="caption" tone="secondary">
              {formatPlaybackTime(media.position)}
            </AppText>
            <AppText variant="caption" tone="secondary">
              {media.duration == null ? t('youtube.live') : formatPlaybackTime(media.duration)}
            </AppText>
          </View>
          <View style={styles.controls}>
            <IconButton
              icon={media.paused ? 'play.fill' : 'pause.fill'}
              label={t(media.paused ? 'youtube.play' : 'youtube.pause')}
              emphasis
              size={72}
              disabled={!ready}
              onPress={() => {
                if (!writing) void onSetPaused(media.targetID, !media.paused);
              }}
            />
            <AppText tone="secondary">
              {t(media.paused ? 'youtube.paused' : 'youtube.playing')}
            </AppText>
          </View>
        </>
      ) : null}
      {!available ? (
        <AppText tone="secondary">{t('youtube.buildRequired')}</AppText>
      ) : !ready ? (
        <AppText tone="secondary">
          {t(`youtube.state.${snapshot?.availability ?? 'disconnected'}`)}
        </AppText>
      ) : (
        <AppText variant="caption" tone="muted">
          {t('youtube.confirmed')}
        </AppText>
      )}
      {failure ? (
        <AppText accessibilityRole="alert">{t(`youtube.failure.${failure}`)}</AppText>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      padding: spacing.xl,
      gap: spacing.lg,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.lg,
    },
    heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    track: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.surfaceRaised,
      overflow: 'hidden',
    },
    progress: { height: '100%', backgroundColor: colors.accent },
    times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -spacing.sm },
    controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  });
