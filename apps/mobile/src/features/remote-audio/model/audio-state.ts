import { isTimerFailure, readSleepTimer, timerIsActive } from '@remote-control/remote-link/timer';
import type { TimerFailure, SleepTimerSnapshot } from '@remote-control/remote-link/timer';
import { isUUID, isMediaFailure, readYouTubeSnapshot } from '@remote-control/remote-link/media';
import type { MediaFailure, YouTubeSnapshot } from '@remote-control/remote-link/media';

export const audioFailures = [
  'invalidVolume',
  'noOutput',
  'outputChanged',
  'volumeUnavailable',
  'muteUnavailable',
  'hardwareFailure',
  'observationUnavailable',
] as const;
export type AudioFailure = (typeof audioFailures)[number];
export type AudioOutput = {
  id: string;
  name: string;
  volume: number | null;
  canSetVolume: boolean;
  muted: boolean | null;
  canSetMute: boolean;
};
export type AudioSnapshot = {
  media: YouTubeSnapshot | null;
  selectionID: string | null;
  timer: SleepTimerSnapshot | null;
  revision: number;
  output: AudioOutput | null;
  failure: AudioFailure | null;
};
export type AudioStatus = {
  owner: string;
  snapshot: AudioSnapshot;
  commandFailure: AudioFailure | null;
  mediaFailure: MediaFailure | null;
  timerFailure: TimerFailure | null;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const failure = (value: unknown): value is AudioFailure =>
  typeof value === 'string' && audioFailures.some((item) => item === value);

export function readAudioStatus(text: string, owner: string): AudioStatus {
  if (text.length > 4096) throw new Error('Invalid audio status');
  const value: unknown = JSON.parse(text);
  if (!record(value) || value.owner !== owner || !record(value.snapshot)) {
    throw new Error('Invalid audio session');
  }
  const snapshot = value.snapshot;
  if (
    !Number.isSafeInteger(snapshot.revision) ||
    (snapshot.revision as number) < 0 ||
    (snapshot.failure != null && !failure(snapshot.failure)) ||
    (value.commandFailure != null && !failure(value.commandFailure)) ||
    (value.mediaFailure != null && !isMediaFailure(value.mediaFailure)) ||
    (value.timerFailure != null && !isTimerFailure(value.timerFailure)) ||
    (snapshot.selectionID != null && !isUUID(snapshot.selectionID))
  ) {
    throw new Error('Invalid audio state');
  }
  let output: AudioOutput | null = null;
  if (snapshot.output != null) {
    const item = snapshot.output;
    if (
      !record(item) ||
      snapshot.failure != null ||
      typeof item.id !== 'string' ||
      !uuid.test(item.id) ||
      typeof item.name !== 'string' ||
      !item.name.trim() ||
      item.name.length > 160 ||
      /[\u0000-\u001f\u007f-\u009f]/.test(item.name) ||
      typeof item.canSetVolume !== 'boolean' ||
      typeof item.canSetMute !== 'boolean' ||
      (item.volume != null &&
        (typeof item.volume !== 'number' ||
          !Number.isFinite(item.volume) ||
          item.volume < 0 ||
          item.volume > 1)) ||
      (item.muted != null && typeof item.muted !== 'boolean') ||
      (item.canSetVolume && item.volume == null) ||
      (item.canSetMute && item.muted == null)
    ) {
      throw new Error('Invalid audio output');
    }
    output = {
      id: item.id,
      name: item.name,
      volume: (item.volume as number | undefined) ?? null,
      canSetVolume: item.canSetVolume,
      muted: (item.muted as boolean | undefined) ?? null,
      canSetMute: item.canSetMute,
    };
  }
  const selectionID = isUUID(snapshot.selectionID) ? snapshot.selectionID.toLowerCase() : null;
  const timer = snapshot.timer == null ? null : readSleepTimer(snapshot.timer);
  if (timer && timerIsActive(timer) && timer.selectionID !== selectionID)
    throw new Error('Timer selection mismatch');
  return {
    owner,
    snapshot: {
      selectionID,
      timer,
      media: snapshot.media == null ? null : readYouTubeSnapshot(snapshot.media),
      revision: snapshot.revision as number,
      output,
      failure: (snapshot.failure as AudioFailure | undefined) ?? null,
    },
    commandFailure: (value.commandFailure as AudioFailure | undefined) ?? null,
    mediaFailure: (value.mediaFailure as MediaFailure | undefined) ?? null,
    timerFailure: (value.timerFailure as TimerFailure | undefined) ?? null,
  };
}

export function mergeAudioStatus(current: AudioStatus | null, next: AudioStatus): AudioStatus {
  if (current && current.owner !== next.owner) throw new Error('Stale audio session');
  const selected =
    current && current.snapshot.revision > next.snapshot.revision
      ? { ...next, snapshot: current.snapshot }
      : next;
  return JSON.stringify(current) === JSON.stringify(selected) ? current! : selected;
}
