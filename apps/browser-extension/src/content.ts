import { packet, readPacket } from './protocol.ts';
import { YouTubeAdapter } from './youtube-adapter.ts';

let adapter = new YouTubeAdapter(document, () => location.href);
let port: chrome.runtime.Port | null = null;
let selectionID: string | null = null;
let interval: ReturnType<typeof setInterval> | null = null;
let busy = false;
const seen: string[] = [];
function publish() {
  if (!port) return;
  try {
    port.postMessage({ ...packet('browserState'), snapshot: adapter.read(), selectionID });
  } catch {
    stop();
  }
}
function stop() {
  if (interval) clearInterval(interval);
  interval = null;
  const old = port;
  port = null;
  selectionID = null;
  old?.disconnect();
}
function start() {
  stop();
  selectionID = crypto.randomUUID();
  adapter = new YouTubeAdapter(document, () => location.href);
  seen.length = 0;
  const selected = chrome.runtime.connect({ name: 'remote-control-youtube-v1' });
  port = selected;
  selected.onDisconnect.addListener(() => {
    if (port === selected) {
      port = null;
      stop();
    }
  });
  selected.onMessage.addListener((value: unknown) => {
    if (port !== selected) return;
    let request;
    try {
      request = readPacket(value, 'downstream');
    } catch {
      stop();
      return;
    }
    if (
      request.type !== 'browserCommand' ||
      !request.requestID ||
      !request.targetID ||
      request.paused === undefined
    )
      return;
    const requestID = request.requestID;
    if (seen.includes(requestID)) {
      stop();
      return;
    }
    seen.push(requestID);
    if (seen.length > 64) seen.shift();
    if (busy) {
      selected.postMessage({ ...packet('browserResult'), requestID, failure: 'notReady' });
      return;
    }
    busy = true;
    void adapter
      .setPaused(request.targetID, request.paused)
      .then((failure) => {
        if (port !== selected) return;
        publish(); // Confirmed page state precedes its acknowledgment on the same ordered port.
        selected.postMessage({
          ...packet('browserResult'),
          requestID,
          ...(failure ? { failure } : {}),
        });
      })
      .catch(() => {
        if (port === selected) stop();
      })
      .finally(() => {
        busy = false;
      });
  });
  publish();
  interval = setInterval(publish, 1000);
}
chrome.runtime.onMessage.addListener((message: unknown, sender, respond) => {
  if (
    sender.id !== chrome.runtime.id ||
    sender.tab ||
    !message ||
    typeof message !== 'object' ||
    !('type' in message)
  )
    return;
  if (message.type === 'selectYouTube') {
    start();
    respond({ ok: true });
  }
});
window.addEventListener('pagehide', stop);
