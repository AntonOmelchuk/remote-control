import { isRecord, isUUID } from './media.ts';

export const TIMER_MINUTES = { minimum: 1, maximum: 720, default: 30 } as const;
export const TIMER_PRESETS = [15, 30, 60, 120] as const;
export const timerFailures = [
  'invalidDuration',
  'timerChanged',
  'selectionChanged',
  'notReady',
  'bridgeUnavailable',
  'blocked',
  'timedOut',
  'late',
] as const;
export type TimerFailure = (typeof timerFailures)[number];
export const timerPhases = [
  'idle',
  'running',
  'executing',
  'completed',
  'cancelled',
  'failed',
] as const;
export type TimerPhase = (typeof timerPhases)[number];
export const timerCancellations = [
  'user',
  'selectionChanged',
  'browserDisconnected',
  'connectionsStopped',
  'ownerRevoked',
] as const;
export type TimerCancellation = (typeof timerCancellations)[number];
export type SleepTimerSnapshot = {
  phase: TimerPhase;
  id: string | null;
  selectionID: string | null;
  durationSeconds: number;
  remainingSeconds: number;
  failure: TimerFailure | null;
  cancellation: TimerCancellation | null;
};
export const isTimerFailure = (value: unknown): value is TimerFailure =>
  typeof value === 'string' && timerFailures.some((item) => item === value);
export const timerIsActive = (timer: SleepTimerSnapshot): boolean =>
  timer.phase === 'running' || timer.phase === 'executing';

export function readSleepTimer(value: unknown): SleepTimerSnapshot {
  if (
    !isRecord(value) ||
    Object.keys(value).some(
      (key) =>
        ![
          'phase',
          'id',
          'selectionID',
          'durationSeconds',
          'remainingSeconds',
          'failure',
          'cancellation',
        ].includes(key),
    ) ||
    !timerPhases.some((phase) => phase === value.phase) ||
    !Number.isInteger(value.durationSeconds) ||
    !Number.isInteger(value.remainingSeconds)
  )
    throw new Error('Invalid sleep timer');
  const duration = value.durationSeconds as number;
  const remaining = value.remainingSeconds as number;
  if (value.phase === 'idle') {
    if (
      value.id != null ||
      value.selectionID != null ||
      duration !== 0 ||
      remaining !== 0 ||
      value.failure != null ||
      value.cancellation != null
    )
      throw new Error('Invalid idle timer');
  } else if (
    !isUUID(value.id) ||
    !isUUID(value.selectionID) ||
    duration < 60 ||
    duration > TIMER_MINUTES.maximum * 60 ||
    duration % 60 !== 0 ||
    remaining < 0 ||
    remaining > duration ||
    (value.phase === 'running' ? remaining === 0 : remaining !== 0) ||
    (value.phase === 'failed' ? !isTimerFailure(value.failure) : value.failure != null) ||
    (value.phase === 'cancelled'
      ? !timerCancellations.some((reason) => reason === value.cancellation)
      : value.cancellation != null)
  )
    throw new Error('Invalid timer state');
  return {
    phase: value.phase as TimerPhase,
    id: isUUID(value.id) ? value.id.toLowerCase() : null,
    selectionID: isUUID(value.selectionID) ? value.selectionID.toLowerCase() : null,
    durationSeconds: duration,
    remainingSeconds: remaining,
    failure: (value.failure as TimerFailure | undefined) ?? null,
    cancellation: (value.cancellation as TimerCancellation | undefined) ?? null,
  };
}
