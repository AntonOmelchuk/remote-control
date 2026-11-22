import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { IconButton } from '@/components/ui/icon-button';
import type { ThemeColors } from '@/design-system/tokens';
import { radii, spacing } from '@/design-system/tokens';
import { useThemeStyles } from '@/design-system/use-theme';
import { useAppTranslation } from '@/localization/use-app-translation';

import type { AudioOutput } from '../model/audio-state';
import { formatVolume, outputIsSilent, stepVolume } from '../model/volume';
import { VolumeSlider } from './volume-slider';

type Props = {
  output: AudioOutput;
  writing: boolean;
  onSetVolume: (outputID: string, volume: number) => Promise<void>;
  onSetMuted: (outputID: string, muted: boolean) => Promise<void>;
};

/// Keyed by output identity: a route change discards its draft instead of retargeting a gesture.
export function AudioOutputCard({ output, writing, onSetVolume, onSetMuted }: Props) {
  const { t } = useAppTranslation();
  const styles = useThemeStyles(createStyles);
  const [draft, setDraft] = useState<number | null>(null);
  const outputID = output.id;
  const commitVolume = useCallback(
    async (value: number) => {
      await onSetVolume(outputID, value);
    },
    [onSetVolume, outputID],
  );
  const displayedVolume = draft ?? output.volume;
  return (
    <View style={styles.card}>
      <AppText variant="label">{output.name}</AppText>
      <AppText variant="caption" tone="secondary">
        {t(
          draft !== null
            ? writing
              ? 'remoteAudio.applying'
              : 'remoteAudio.adjusting'
            : 'remoteAudio.confirmed',
        )}
      </AppText>
      <View style={styles.heading}>
        <AppText variant="number">{formatVolume(displayedVolume)}</AppText>
        <IconButton
          size={48}
          icon={outputIsSilent(output) ? 'speaker.slash.fill' : 'speaker.wave.2.fill'}
          label={t(output.muted ? 'remoteAudio.unmute' : 'remoteAudio.mute')}
          selected={output.muted ?? false}
          disabled={!output.canSetMute}
          onPress={() => {
            void onSetMuted(output.id, !output.muted);
          }}
        />
      </View>
      {output.volume !== null ? (
        <VolumeSlider
          value={output.volume}
          draft={draft}
          disabled={writing || !output.canSetVolume}
          onDraftChange={setDraft}
          onCommit={commitVolume}
        />
      ) : null}
      <View style={styles.heading}>
        <IconButton
          size={48}
          icon="minus"
          label={t('remoteAudio.decrease')}
          disabled={!output.canSetVolume || output.volume === 0}
          onPress={() => {
            void onSetVolume(output.id, stepVolume(output.volume ?? 0, -1));
          }}
        />
        <AppText variant="caption" tone="secondary" style={styles.hint}>
          {t(
            output.muted
              ? 'remoteAudio.muted'
              : output.volume === 0
                ? 'remoteAudio.silent'
                : 'remoteAudio.volume',
          )}
        </AppText>
        <IconButton
          size={48}
          icon="plus"
          label={t('remoteAudio.increase')}
          disabled={!output.canSetVolume || output.volume === 1}
          onPress={() => {
            void onSetVolume(output.id, stepVolume(output.volume ?? 0, 1));
          }}
        />
      </View>
      {!output.canSetVolume ? (
        <AppText variant="caption">{t('remoteAudio.volumeUnavailable')}</AppText>
      ) : null}
      {!output.canSetMute ? (
        <AppText variant="caption">{t('remoteAudio.muteUnavailable')}</AppText>
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
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    heading: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
    },
    hint: { flex: 1, textAlign: 'center' },
  });
