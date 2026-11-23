export const mediaFailures = [
  'bridgeUnavailable',
  'targetChanged',
  'notReady',
  'blocked',
  'timedOut',
] as const;
export type MediaFailure = (typeof mediaFailures)[number];
export type ReadyYouTube = {
  availability: 'ready' | 'advertisement';
  targetID: string;
  videoID: string;
  title: string;
  paused: boolean;
  position: number;
  duration: number | null;
};
export type YouTubeSnapshot =
  ReadyYouTube | { availability: 'unavailable' | 'disconnected' | 'stale' };
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
export const isUUID = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const isVideoID = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{11}$/.test(value);
export const isMediaFailure = (value: unknown): value is MediaFailure =>
  typeof value === 'string' && mediaFailures.some((item) => item === value);
export function utf8Length(value: string): number {
  let size = 0;
  for (const char of value) {
    const point = char.codePointAt(0) ?? 0;
    if (point >= 0xd800 && point <= 0xdfff) throw new Error('Invalid Unicode');
    size += point < 0x80 ? 1 : point < 0x800 ? 2 : point < 0x10000 ? 3 : 4;
  }
  return size;
}
export function readYouTubeSnapshot(value: unknown): YouTubeSnapshot {
  if (!isRecord(value)) throw new Error('Invalid media state');
  const fields = ['availability', 'targetID', 'videoID', 'title', 'paused', 'position', 'duration'];
  if (Object.keys(value).some((key) => !fields.includes(key)))
    throw new Error('Unknown media field');
  const availability = value.availability;
  if (availability === 'ready' || availability === 'advertisement') {
    if (
      !isUUID(value.targetID) ||
      !isVideoID(value.videoID) ||
      typeof value.title !== 'string' ||
      !value.title.trim() ||
      utf8Length(value.title) > 200 ||
      /[\p{Cc}\p{Cf}]/u.test(value.title) ||
      typeof value.paused !== 'boolean' ||
      typeof value.position !== 'number' ||
      !Number.isFinite(value.position) ||
      value.position < 0 ||
      value.position > 604800 ||
      (value.duration != null &&
        (typeof value.duration !== 'number' ||
          !Number.isFinite(value.duration) ||
          value.duration < 0 ||
          value.duration > 604800))
    ) {
      throw new Error('Invalid media target');
    }
    return {
      availability,
      // Swift and Chrome serialize the same UUID with different letter casing.
      targetID: value.targetID.toLowerCase(),
      videoID: value.videoID,
      title: value.title,
      paused: value.paused,
      position: value.position,
      duration: (value.duration as number | undefined) ?? null,
    };
  }
  if (
    !['unavailable', 'disconnected', 'stale'].includes(String(availability)) ||
    fields.slice(1).some((key) => value[key] != null)
  )
    throw new Error('Invalid empty media state');
  return { availability: availability as 'unavailable' | 'disconnected' | 'stale' };
}
