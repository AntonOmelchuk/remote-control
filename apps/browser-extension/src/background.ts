import config from '../browser.config.json';
import { isYouTubeURL, packet, readPacket, watchVideoID } from './protocol.ts';
import type { BrowserPacket } from './protocol.ts';

let native: chrome.runtime.Port | null = null;
let selected: chrome.runtime.Port | null = null;
let expectedTab: number | null = null;
let phase: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
let lastState: BrowserPacket = {
  ...packet('browserState'),
  snapshot: { availability: 'unavailable' },
};
let lastStateAt = 0;
let heartbeat: ReturnType<typeof setInterval> | null = null;
let pendingCommand: string | null = null;
let commandTimer: ReturnType<typeof setTimeout> | null = null;
const seenCommands: string[] = [];

function send(packet: BrowserPacket) {
  if (!native || phase !== 'connected') return;
  try {
    native.postMessage(packet);
  } catch {
    disconnectNative();
  }
}
function finishCommand(failure: 'targetChanged' | 'notReady' | 'timedOut') {
  if (!pendingCommand) return;
  send({ ...packet('browserResult'), requestID: pendingCommand, failure });
  pendingCommand = null;
  if (commandTimer) clearTimeout(commandTimer);
  commandTimer = null;
}
function clearSelection() {
  finishCommand('targetChanged');
  expectedTab = null;
  const old = selected;
  selected = null;
  old?.disconnect();
  lastState = { ...packet('browserState'), snapshot: { availability: 'unavailable' } };
  lastStateAt = performance.now();
  send(lastState);
}
function disconnectNative() {
  const old = native;
  native = null;
  phase = 'disconnected';
  if (heartbeat) clearInterval(heartbeat);
  heartbeat = null;
  pendingCommand = null;
  if (commandTimer) clearTimeout(commandTimer);
  commandTimer = null;
  old?.disconnect();
}
function connectNative() {
  if (native) return;
  phase = 'connecting';
  seenCommands.length = 0;
  const port = chrome.runtime.connectNative(config.nativeHost);
  native = port;
  port.onDisconnect.addListener(() => {
    void chrome.runtime.lastError;
    if (native === port) disconnectNative();
  });
  port.onMessage.addListener((value: unknown) => {
    if (native !== port) return;
    let message;
    try {
      message = readPacket(value, 'downstream');
    } catch {
      disconnectNative();
      return;
    }
    if (message.type === 'browserReady') {
      phase = 'connected';
      if (performance.now() - lastStateAt < 3000) send(lastState);
      if (heartbeat) clearInterval(heartbeat);
      heartbeat = setInterval(() => send(packet('browserHeartbeat')), 10000);
      return;
    }
    if (message.type !== 'browserCommand' || !message.requestID) return;
    if (seenCommands.includes(message.requestID) || phase !== 'connected') {
      disconnectNative();
      return;
    }
    seenCommands.push(message.requestID);
    if (seenCommands.length > 64) seenCommands.shift();
    if (pendingCommand) {
      send({ ...packet('browserResult'), requestID: message.requestID, failure: 'notReady' });
      return;
    }
    pendingCommand = message.requestID;
    if (
      !selected ||
      performance.now() - lastStateAt >= 3000 ||
      !lastState.snapshot ||
      !('targetID' in lastState.snapshot) ||
      lastState.snapshot.targetID !== message.targetID
    ) {
      finishCommand('targetChanged');
      return;
    }
    try {
      selected.postMessage(message);
    } catch {
      finishCommand('notReady');
      return;
    }
    commandTimer = setTimeout(() => finishCommand('timedOut'), 4500);
  });
}
chrome.runtime.onConnect.addListener((port) => {
  const sender = port.sender;
  if (
    port.name !== 'remote-control-youtube-v1' ||
    sender?.id !== chrome.runtime.id ||
    sender.frameId !== 0 ||
    !sender.documentId ||
    sender.tab?.incognito ||
    sender.tab?.id !== expectedTab ||
    !isYouTubeURL(sender.url)
  ) {
    port.disconnect();
    return;
  }
  const previous = selected;
  selected = port;
  previous?.disconnect();
  port.onMessage.addListener((value: unknown) => {
    if (selected !== port) return;
    let message;
    try {
      message = readPacket(value, 'upstream');
    } catch {
      clearSelection();
      return;
    }
    if (message.type === 'browserState') {
      lastState = message;
      lastStateAt = performance.now();
      send(message);
    } else if (message.type === 'browserResult' && message.requestID === pendingCommand) {
      pendingCommand = null;
      if (commandTimer) clearTimeout(commandTimer);
      commandTimer = null;
      send(message);
    } else {
      clearSelection();
    }
  });
  port.onDisconnect.addListener(() => {
    if (selected === port) clearSelection();
  });
});
chrome.runtime.onMessage.addListener((value: unknown, sender, respond) => {
  if (
    sender.id !== chrome.runtime.id ||
    sender.tab ||
    sender.url !== chrome.runtime.getURL('popup.html') ||
    !value ||
    typeof value !== 'object' ||
    !('type' in value)
  )
    return;
  if (value.type === 'status') {
    respond({
      phase,
      snapshot:
        performance.now() - lastStateAt < 3000 ? lastState.snapshot : { availability: 'stale' },
      selected: selected !== null,
    });
    return;
  }
  if (value.type === 'connect') {
    connectNative();
    respond({ ok: true });
    return;
  }
  if (value.type === 'disconnect') {
    disconnectNative();
    clearSelection();
    respond({ ok: true });
    return;
  }
  if (value.type === 'select') {
    void chrome.tabs
      .query({ active: true, currentWindow: true })
      .then(async (tabs) => {
        const tab = tabs[0];
        if (typeof tab?.id !== 'number' || tab.incognito || !watchVideoID(tab.url ?? '')) {
          respond({ ok: false });
          return;
        }
        clearSelection();
        expectedTab = tab.id;
        connectNative();
        try {
          await chrome.tabs.sendMessage(tab.id, { type: 'selectYouTube' });
          respond({ ok: true });
        } catch {
          clearSelection();
          respond({ ok: false });
        }
      })
      .catch(() => respond({ ok: false }));
    return true;
  }
});
