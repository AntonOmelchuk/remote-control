import { SleepTimerCard } from '@/features/sleep-timer/components/sleep-timer-card';
import { router } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { ActionButton } from '@/components/ui/action-button';
import { AppText } from '@/components/ui/app-text';
import { YouTubeCard } from '@/features/youtube/components/youtube-card';
import { Screen } from '@/components/ui/screen';
import { useTheme } from '@/design-system/use-theme';
import { useAppTranslation } from '@/localization/use-app-translation';

import { AudioOutputCard } from '../components/audio-output-card';
import { useRemoteAudio } from '../model/use-remote-audio';

export function RemoteAudioScreen() {
  const { t } = useAppTranslation();
  const { colors } = useTheme();
  const remote = useRemoteAudio();
  const output = remote.status?.snapshot.output;
  const failure = remote.status?.commandFailure ?? remote.status?.snapshot.failure;
  const connected = remote.phase === 'connected';
  return (
    <Screen>
      <AppText variant="eyebrow" tone="accent">
        {t('remoteAudio.eyebrow')}
      </AppText>
      <AppText variant="hero">{t('remoteAudio.title')}</AppText>
      <AppText tone="secondary">{t('remoteAudio.description')}</AppText>
      {!remote.available ? <AppText>{t('remoteAudio.buildRequired')}</AppText> : null}
      {remote.phase === 'connecting' ? (
        <ActivityIndicator color={colors.accent} accessibilityLabel={t('remoteAudio.connecting')} />
      ) : null}
      {connected ? <AppText tone="accent">{t('remoteAudio.connected')}</AppText> : null}
      {remote.phase === 'disconnected' ? (
        <AppText accessibilityRole="alert">{t('remoteAudio.disconnected')}</AppText>
      ) : null}
      {connected && output ? (
        <AudioOutputCard
          key={output.id}
          output={output}
          writing={remote.writing}
          onSetVolume={remote.setVolume}
          onSetMuted={remote.setMuted}
        />
      ) : connected ? (
        <AppText>{t('remoteAudio.noOutput')}</AppText>
      ) : null}
      {connected ? (
        <YouTubeCard
          snapshot={remote.status?.snapshot.media ?? null}
          failure={remote.status?.mediaFailure ?? null}
          available={remote.mediaAvailable}
          writing={remote.writing}
          onSetPaused={remote.setPlayback}
        />
      ) : null}
      {connected ? (
        <SleepTimerCard
          timer={remote.status?.snapshot.timer ?? null}
          selectionID={remote.status?.snapshot.selectionID ?? null}
          playerReady={remote.status?.snapshot.media?.availability === 'ready'}
          available={remote.timerAvailable}
          writing={remote.writing}
          failure={remote.status?.timerFailure ?? null}
          onStart={remote.startSleepTimer}
          onCancel={remote.cancelSleepTimer}
        />
      ) : null}
      {failure ? (
        <AppText accessibilityRole="alert">{t(`remoteAudio.failure.${failure}`)}</AppText>
      ) : null}
      {remote.available && remote.phase === 'disconnected' ? (
        <ActionButton
          label={t('remoteAudio.reconnect')}
          onPress={() => {
            void remote.connect();
          }}
        />
      ) : null}
      {connected ? (
        <ActionButton
          label={t('remoteAudio.disconnect')}
          variant="secondary"
          onPress={remote.disconnect}
        />
      ) : null}
      {!connected && remote.phase !== 'connecting' ? (
        <ActionButton
          label={t('pairing.scan')}
          variant="secondary"
          onPress={() => router.push('/pair')}
        />
      ) : null}
      <AppText variant="caption" tone="muted">
        {t('remoteAudio.scope')}
      </AppText>
    </Screen>
  );
}
