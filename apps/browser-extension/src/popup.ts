import { isRecord, readYouTubeSnapshot } from '@remote-control/remote-link/media';

const text = (key: string) => chrome.i18n.getMessage(key) || key;
document.documentElement.lang = chrome.i18n.getUILanguage();
for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
  element.textContent = text(element.dataset.i18n ?? '');
}
const status = document.querySelector<HTMLElement>('#status');
const video = document.querySelector<HTMLElement>('#video');
const hint = document.querySelector<HTMLElement>('#hint');
let selecting = false;
async function refresh() {
  try {
    const value: unknown = await chrome.runtime.sendMessage({ type: 'status' });
    if (!isRecord(value)) return;
    if (status)
      status.textContent = text(
        value.phase === 'connected'
          ? 'connected'
          : value.phase === 'connecting'
            ? 'connecting'
            : 'disconnected',
      );
    const snapshot = readYouTubeSnapshot(value.snapshot);
    if (video) video.textContent = 'title' in snapshot ? snapshot.title : text('noVideo');
    if (hint && !selecting)
      hint.textContent = text(
        value.phase === 'connected'
          ? 'paused' in snapshot
            ? snapshot.paused
              ? 'paused'
              : 'playing'
            : 'selectHint'
          : 'setupHint',
      );
  } catch {
    if (status) status.textContent = text('disconnected');
  }
}
for (const action of ['select', 'connect', 'disconnect']) {
  document.querySelector(`#${action}`)?.addEventListener('click', () => {
    selecting = true;
    void chrome.runtime
      .sendMessage({ type: action })
      .then((value: unknown) => {
        if (action === 'select' && (!isRecord(value) || value.ok !== true) && hint)
          hint.textContent = text('selectError');
        else selecting = false;
        void refresh();
      })
      .catch(() => {
        if (hint) hint.textContent = text('setupHint');
      });
  });
}
void refresh();
setInterval(() => {
  void refresh();
}, 750);
