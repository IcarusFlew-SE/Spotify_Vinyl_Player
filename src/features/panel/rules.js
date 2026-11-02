// When the side panel may switch by itself (WAI/WCAG 3.2.2: only as the result of the user's own action).
export const AUTO_SWITCH_WINDOW_MS = 20_000; // a play request older than this no longer counts

// Which panel suits a song: lyrics when there are any to show, otherwise its track list
export const panelFor = (lyricsStatus) =>
  lyricsStatus === 'synced' || lyricsStatus === 'plain' ? 'lyrics' : 'tracks';

// The lyrics state is settled (found or not) — anything but loading/idle
export const isSettled = (lyricsStatus) => lyricsStatus !== 'loading' && lyricsStatus !== 'idle';

/**
 * @param {object} p
 * @param {boolean} p.enabled        the "Show lyrics when I play" setting
 * @param {number|null} p.requestedAt when the user pressed play on a record or track
 * @param {number} p.interactedAt     last time the user touched the side panel
 * @param {number} p.now
 */
export function shouldAutoSwitch({ enabled, requestedAt, interactedAt, now }) {
  if (!enabled || requestedAt == null) return false;
  if (now - requestedAt > AUTO_SWITCH_WINDOW_MS) return false;
  return interactedAt <= requestedAt; // the user did something else since — leave the panel alone
}
