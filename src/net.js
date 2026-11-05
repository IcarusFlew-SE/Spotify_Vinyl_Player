import { setState } from './state.js';

// Connection status — the single owner of the `net` slice.
// Two sources: the browser's online/offline events (fast, but `navigator.onLine` can say "online" on
// Wi-Fi without internet), corrected by real request results reported by sync.js.
const FAILURES_TO_OFFLINE = 2; // one blip isn't "offline"; two failed polls in a row are

let failures = 0;
let started = false;

export function startNet() {
  if (started) return;
  started = true;
  window.addEventListener('online', reportOk); // optimistic — the recovery poll confirms it
  window.addEventListener('offline', () => {
    failures = FAILURES_TO_OFFLINE;
    setState('net', { online: false });
  });
  if (navigator.onLine === false) setState('net', { online: false });
}

export function reportOk() {
  failures = 0;
  setState('net', { online: true });
}

export function reportNetworkError() {
  failures += 1;
  if (failures >= FAILURES_TO_OFFLINE) setState('net', { online: false });
}
