import type { MediaFailure, YouTubeSnapshot } from '@remote-control/remote-link/media';
import { watchVideoID } from './protocol.ts';

function cleanTitle(value: string): string {
  let result = '';
  let bytes = 0;
  for (const char of value.replace(/[\p{Cc}\p{Cf}]/gu, '').trim()) {
    const point = char.codePointAt(0) ?? 0;
    if (point >= 0xd800 && point <= 0xdfff) continue;
    const size = point < 0x80 ? 1 : point < 0x800 ? 2 : point < 0x10000 ? 3 : 4;
    if (bytes + size > 200) break;
    result += char;
    bytes += size;
  }
  return result || 'YouTube';
}

export class YouTubeAdapter {
  private element: HTMLVideoElement | null = null;
  private videoID: string | null = null;
  private targetID = crypto.randomUUID();
  private readonly page: Document;
  private readonly url: () => string;
  constructor(page: Document, url: () => string) {
    this.page = page;
    this.url = url;
  }

  read(): YouTubeSnapshot {
    const id = watchVideoID(this.url());
    const video = this.page.querySelector<HTMLVideoElement>('video.html5-main-video');
    if (id !== this.videoID || video !== this.element) {
      this.videoID = id;
      this.element = video;
      this.targetID = crypto.randomUUID();
    }
    if (
      !id ||
      !video ||
      !Number.isFinite(video.currentTime) ||
      video.currentTime < 0 ||
      video.currentTime > 604800 ||
      video.readyState < 1
    ) {
      return { availability: 'unavailable' };
    }
    const advertisement =
      this.page.querySelector('.html5-video-player')?.classList.contains('ad-showing') ?? false;
    const title =
      this.page.querySelector('h1.ytd-watch-metadata')?.textContent ??
      this.page.title.replace(/ - YouTube$/, '');
    return {
      availability: advertisement ? 'advertisement' : 'ready',
      targetID: this.targetID,
      videoID: id,
      title: cleanTitle(title),
      paused: video.paused || video.ended,
      position: video.currentTime,
      duration:
        Number.isFinite(video.duration) && video.duration >= 0 && video.duration <= 604800
          ? video.duration
          : null,
    };
  }

  async setPaused(targetID: string, paused: boolean): Promise<MediaFailure | null> {
    const expectedTarget = targetID.toLowerCase();
    const before = this.read();
    const element = this.element;
    if (!('targetID' in before) || before.targetID !== expectedTarget || !element)
      return 'targetChanged';
    if (before.availability !== 'ready') return 'notReady';
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (paused) element.pause();
      else
        await Promise.race([
          element.play(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error('play deadline')), 3500);
          }),
        ]);
      const after = this.read();
      if (!('targetID' in after) || after.targetID !== expectedTarget || this.element !== element)
        return 'targetChanged';
      return after.availability === 'ready' && after.paused === paused ? null : 'notReady';
    } catch {
      const current = this.read();
      return 'targetID' in current && current.targetID === expectedTarget
        ? 'blocked'
        : 'targetChanged';
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
