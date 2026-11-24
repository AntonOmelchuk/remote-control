import { TIMER_MINUTES } from '@remote-control/remote-link/timer';
export const DURATION_THUMB_SIZE = 24;
export function clampMinutes(value: number): number {
  return Number.isFinite(value)
    ? Math.max(TIMER_MINUTES.minimum, Math.min(TIMER_MINUTES.maximum, Math.round(value)))
    : TIMER_MINUTES.default;
}
export function minutesAtPosition(position: number, width: number): number {
  const ratio = Math.max(
    0,
    Math.min(1, (position - DURATION_THUMB_SIZE / 2) / Math.max(1, width - DURATION_THUMB_SIZE)),
  );
  return clampMinutes(
    TIMER_MINUTES.minimum + ratio * (TIMER_MINUTES.maximum - TIMER_MINUTES.minimum),
  );
}
export function durationParts(minutes: number): { hours: number; minutes: number } {
  const value = clampMinutes(minutes);
  return { hours: Math.floor(value / 60), minutes: value % 60 };
}
