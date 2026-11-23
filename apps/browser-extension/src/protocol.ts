import {
  isMediaFailure,
  isRecord,
  isUUID,
  readYouTubeSnapshot,
} from '@remote-control/remote-link/media';
import type { MediaFailure, YouTubeSnapshot } from '@remote-control/remote-link/media';

export type BrowserPacket = {
  version: 1;
  type: 'browserState' | 'browserResult' | 'browserHeartbeat' | 'browserReady' | 'browserCommand';
  sequence: 0;
  requestID?: string;
  targetID?: string;
  paused?: boolean;
  snapshot?: YouTubeSnapshot;
  failure?: MediaFailure;
};
export const packet = (type: BrowserPacket['type']): BrowserPacket => ({
  version: 1,
  type,
  sequence: 0,
});
export function readPacket(value: unknown, direction: 'upstream' | 'downstream'): BrowserPacket {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    value.sequence !== 0 ||
    Object.keys(value).some(
      (key) =>
        ![
          'version',
          'type',
          'sequence',
          'requestID',
          'targetID',
          'paused',
          'snapshot',
          'failure',
        ].includes(key),
    )
  )
    throw new Error('Invalid browser packet');
  const result = packet(value.type as BrowserPacket['type']);
  if (direction === 'upstream') {
    if (value.targetID != null || value.paused != null) throw new Error('Invalid upstream command');
    if (value.type === 'browserState' && value.requestID == null && value.failure == null) {
      result.snapshot = readYouTubeSnapshot(value.snapshot);
      if (
        result.snapshot.availability === 'disconnected' ||
        result.snapshot.availability === 'stale'
      )
        throw new Error('Invalid page state');
      return result;
    }
    if (
      value.type === 'browserResult' &&
      isUUID(value.requestID) &&
      value.snapshot == null &&
      (value.failure == null || isMediaFailure(value.failure))
    ) {
      result.requestID = value.requestID.toLowerCase();
      if (isMediaFailure(value.failure)) result.failure = value.failure;
      return result;
    }
  } else if (
    value.type === 'browserCommand' &&
    isUUID(value.requestID) &&
    isUUID(value.targetID) &&
    typeof value.paused === 'boolean' &&
    value.snapshot == null &&
    value.failure == null
  ) {
    return {
      ...result,
      requestID: value.requestID.toLowerCase(),
      targetID: value.targetID.toLowerCase(),
      paused: value.paused,
    };
  }
  if (
    (value.type === 'browserHeartbeat' ||
      (direction === 'downstream' && value.type === 'browserReady')) &&
    value.requestID == null &&
    value.targetID == null &&
    value.paused == null &&
    value.snapshot == null &&
    value.failure == null
  )
    return result;
  throw new Error('Unexpected browser packet');
}
export function watchVideoID(url: string): string | null {
  try {
    const parsed = new URL(url);
    const id = parsed.searchParams.get('v');
    return parsed.origin === 'https://www.youtube.com' &&
      parsed.pathname === '/watch' &&
      id &&
      /^[A-Za-z0-9_-]{11}$/.test(id)
      ? id
      : null;
  } catch {
    return null;
  }
}
export function isYouTubeURL(url: string | undefined): boolean {
  try {
    return new URL(url ?? '').origin === 'https://www.youtube.com';
  } catch {
    return false;
  }
}
