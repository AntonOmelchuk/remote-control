export const previewMedia = {
  title: 'Sunday, slowed down',
  source: 'YouTube',
  durationSeconds: 768,
  startingPositionSeconds: 272,
} as const;

export const sleepTimerOptions = [null, 15, 30, 60] as const;
export type SleepTimerMinutes = (typeof sleepTimerOptions)[number];

export type PreviewState = {
  volume: number;
  isMuted: boolean;
  isPlaying: boolean;
  positionSeconds: number;
  sleepTimerMinutes: SleepTimerMinutes;
};

export type PreviewAction =
  | { type: 'volumeChanged'; delta: number }
  | { type: 'muteToggled' }
  | { type: 'playbackToggled' }
  | { type: 'seeked'; deltaSeconds: number }
  | { type: 'sleepTimerSelected'; minutes: SleepTimerMinutes }
  | { type: 'reset' };

export function createPreviewState(): PreviewState {
  return {
    volume: 42,
    isMuted: false,
    isPlaying: false,
    positionSeconds: previewMedia.startingPositionSeconds,
    sleepTimerMinutes: null,
  };
}

function clamp(value: number, maximum: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(maximum, Math.max(0, Math.round(value))) : fallback;
}

/** Preview state is local UI state; it must never be treated as confirmed Mac state. */
export function previewReducer(state: PreviewState, action: PreviewAction): PreviewState {
  switch (action.type) {
    case 'volumeChanged':
      return {
        ...state,
        volume: clamp(state.volume + action.delta, 100, state.volume),
        isMuted: false,
      };
    case 'muteToggled':
      return { ...state, isMuted: !state.isMuted };
    case 'playbackToggled':
      return {
        ...state,
        isPlaying: !state.isPlaying,
        positionSeconds:
          state.positionSeconds === previewMedia.durationSeconds ? 0 : state.positionSeconds,
      };
    case 'seeked': {
      const positionSeconds = clamp(
        state.positionSeconds + action.deltaSeconds,
        previewMedia.durationSeconds,
        state.positionSeconds,
      );
      return {
        ...state,
        positionSeconds,
        isPlaying: positionSeconds === previewMedia.durationSeconds ? false : state.isPlaying,
      };
    }
    case 'sleepTimerSelected':
      return { ...state, sleepTimerMinutes: action.minutes };
    case 'reset':
      return createPreviewState();
    default:
      return unreachable(action);
  }
}

function unreachable(_action: never): never {
  throw new Error('Unknown remote preview action');
}

export function formatPlaybackTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function formatSleepTimer(minutes: SleepTimerMinutes): string {
  return minutes === null ? 'Off' : `${minutes} min`;
}
