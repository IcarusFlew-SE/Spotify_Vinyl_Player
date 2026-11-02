// Slice-based store: each slice notifies only its own subscribers, and only on real changes
const listeners = new Map(); // slice name -> Set<fn>

export const IDLE_PLAYBACK = Object.freeze({
  status: 'idle', // 'idle' | 'loading' | 'ready'
  isPlaying: false,
  trackId: null,
  primaryArtist: null, // first artist only — what lyric lookups match on
  contextUri: null, // the playlist / album / collection the track is playing from
  device: 'remote', // 'remote' (a Spotify app plays) | 'browser' (the in-browser player plays)
  trackTitle: null,
  trackArtist: null,
  album: null,
  trackUrl: null, // open.spotify.com link, for attribution / "open in Spotify"
  artUrl: null, // ~300 px — sleeve and label
  artThumbUrl: null, // ~64 px — colour extraction
  progressMs: 0, // position at the last sync…
  progressAt: 0, // …and when that was (Date.now()), so the bar can advance between polls
  durationMs: 0,
});

export const EMPTY_TRACKS = Object.freeze({
  record: null, // { uri, kind, title, subtitle, ... } the list belongs to
  status: 'idle', // 'idle' | 'loading' | 'ready' | 'error' | 'unsupported'
  items: [], // { id, uri, title, artist, durationMs, playable, url }
  next: null, // URL of the next page, if any
});

export const state = {
  auth: {
    status: 'unknown', // 'unknown' (resolving stored session) | 'connected' | 'disconnected'
    plan: 'unknown', // 'premium' | 'free' | 'unknown' — free accounts get follow mode (no playback control)
  },
  playback: { ...IDLE_PLAYBACK },
  timer: {
    mode: 'focus', // 'focus' | 'break'
    secondsLeft: 25 * 60,
    running: false,
    focusMinutes: 25, // chosen on the timer sheet's sliders; remembered per browser
    breakMinutes: 5,
  },
  theme: { vars: null, source: 'fallback' }, // set by features/mood
  library: {
    kind: 'playlists', // 'playlists' | 'albums' | 'liked'
    status: 'idle', // 'idle' (not connected) | 'loading' | 'ready' | 'error' | 'needs-scope'
    items: [], // { id, uri, kind, title, subtitle, meta, artUrl, thumbUrl }
    selected: 0, // index of the record at the crate's centre
  },
  // Track lists: `preview` = the crate's selected record (slide-out), `context` = what's playing (Tracks tab)
  preview: { ...EMPTY_TRACKS },
  context: { ...EMPTY_TRACKS },
  lyrics: { trackId: null, status: 'idle', lines: [], plain: null }, // see features/lyrics
  panel: {
    active: 'records', // side panel tab: 'records' | 'tracks' | 'lyrics'
    drawerOpen: false, // the crate's "Tracks ›" slide-out
    autoLyrics: true, // switch to lyrics after the user plays something (remembered per browser)
  },
  ui: { toast: null }, // { message, tone, id }
};

export const isConnected = (s = state) => s.auth.status === 'connected';
// Spotify only lets apps control Premium accounts; free accounts are followed, not controlled
export const canControl = (s = state) => isConnected(s) && s.auth.plan !== 'free';

export function setState(slice, patch) {
  const current = state[slice];
  const changed = Object.keys(patch).some((key) => !Object.is(current[key], patch[key]));
  if (!changed) return;

  state[slice] = { ...current, ...patch };
  listeners.get(slice)?.forEach((fn) => fn(state[slice], state));
}

// Calls fn immediately (initial paint), then on every change to that slice
export function subscribe(slice, fn) {
  if (!listeners.has(slice)) listeners.set(slice, new Set());
  listeners.get(slice).add(fn);
  fn(state[slice], state);
  return () => listeners.get(slice).delete(fn); // unsubscribe handle
}

// Show a toast from anywhere — the id makes a repeated message re-trigger
let toastSeq = 0;
export function notify(message, tone = 'info') {
  setState('ui', { toast: { message, tone, id: ++toastSeq } });
}
