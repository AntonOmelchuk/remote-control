import type { AudioOutput } from './audio-state';

export const VOLUME_STEP_PERCENT = 5;
export const VOLUME_THUMB_SIZE = 24;

export function quantizeVolume(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError('Volume must be finite');
  return Math.max(0, Math.min(100, Math.round(value * 100))) / 100;
}

export function volumeAtPosition(position: number, width: number): number {
  const travel = Math.max(1, width - VOLUME_THUMB_SIZE);
  return quantizeVolume((position - VOLUME_THUMB_SIZE / 2) / travel);
}

export function stepVolume(value: number, direction: -1 | 1): number {
  // HAL returns Float32: subtracting 0.05 directly can leave a positive residue at zero.
  const percent = Math.round(quantizeVolume(value) * 100);
  return Math.max(0, Math.min(100, percent + direction * VOLUME_STEP_PERCENT)) / 100;
}

export function formatVolume(value: number | null): string {
  if (value === null) return '—';
  const percent = Math.round(value * 100);
  // An external fractional gain must never be described as exact silence.
  if (value > 0 && percent === 0) return '<1%';
  return `${percent}%`;
}

export function outputIsSilent(output: Pick<AudioOutput, 'volume' | 'muted'>): boolean {
  return output.muted === true || output.volume === 0;
}
