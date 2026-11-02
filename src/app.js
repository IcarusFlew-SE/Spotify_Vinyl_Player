import '@fontsource-variable/archivo/wdth.css'; // one variable file: weight + width axes
import { state, setState, subscribe, isConnected, IDLE_PLAYBACK } from './state.js';
import { redirectToSpotifyAuth, handleRedirectCallback, getValidToken, logout } from './auth/auth.js';
import { play, pause, next, previous, seek } from './api/player.js';
import { playRecord } from './api/library.js';
import { startSync, stopSync, syncNow } from './sync.js';
import {
  initTimer,
  toggleTimer,
  resetTimer,
  skipPhase,
  setLengths,
  requestNotificationPermission,
} from './features/timer/timer.js';
import { startMoodSync } from './features/mood/index.js';
import { loadLibrary, resetLibrary } from './features/library/index.js';
import { notifyError } from './messages.js';
import { mountTheme } from './ui/theme.js';
import { mountDeck } from './ui/deck.js';
import { mountControls } from './ui/controls.js';
import { mountTimerView } from './ui/timer-view.js';
import { mountToast } from './ui/toast.js';
import { mountShortcuts } from './ui/shortcuts.js';
import { mountCrate } from './ui/crate.js';
import { mountProgress } from './ui/progress.js';

// Dev-only design fixtures, e.g. ?demo=golden — see src/dev/demo.js. Compiled out of production builds.
const DEMO = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('demo') : null;

// Swappable so demo mode can serve fixtures instead of calling Spotify
let libraryLoader = loadLibrary;
let recordPlayer = (record, records) => runPlayback(() => playRecord(record, records));
let seeker = (ms) => runPlayback(() => seek(ms));

// Session lifecycle — login, reload, expiry and logout all just set auth.status
subscribe('auth', ({ status }) => {
  if (status === 'connected') {
    setState('playback', { ...IDLE_PLAYBACK, status: 'loading' }); // skeleton until the first poll lands
    if (!DEMO) startSync(); // begins polling currently-playing, drives all subsequent playback updates
    libraryLoader(state.library.kind);
  } else {
    stopSync();
    setState('playback', IDLE_PLAYBACK);
    if (status === 'disconnected') resetLibrary();
  }
});

// Playback controls
async function runPlayback(action) {
  if (!isConnected()) return;
  try {
    await action();
    // No optimistic update — poll right away so the real state lands without waiting a full interval
    syncNow();
  } catch (err) {
    if (err.code === 'UNAUTHORIZED') setState('auth', { status: 'disconnected' });
    notifyError(err, 'Playback action failed.');
  }
}

const togglePlay = () => runPlayback(state.playback.isPlaying ? pause : play);
const playNext = () => runPlayback(next);
const playPrev = () => runPlayback(previous);

mountTheme();
startMoodSync();
mountDeck();
mountToast();
initTimer();
mountTimerView({ onToggle: toggleTimer, onReset: resetTimer, onSkip: skipPhase, onLengths: setLengths });
mountProgress({ onSeek: (ms) => seeker(ms) });
mountControls({
  onTogglePlay: togglePlay,
  onNext: playNext,
  onPrev: playPrev,
  // Login — request notification permission during this real user gesture
  onLogin: async () => {
    requestNotificationPermission();
    try {
      await redirectToSpotifyAuth();
    } catch (err) {
      notifyError(err);
    }
  },
  onLogout: () => {
    logout();
    setState('auth', { status: 'disconnected' });
  },
});
mountShortcuts({ onTogglePlay: togglePlay, onNext: playNext, onPrev: playPrev, onToggleTimer: toggleTimer });
mountCrate({
  onSelectKind: (kind) => (isConnected() ? libraryLoader(kind) : setState('library', { kind })),
  onRetry: (kind) => libraryLoader(kind, { force: true }),
  onPlay: (record, records) => recordPlayer(record, records),
  // New scopes need a fresh consent screen; the existing session is replaced on return
  onReconnect: () => redirectToSpotifyAuth().catch(notifyError),
});

// Spotify redirect callback, or resume a previous session on reload
async function init() {
  try {
    if (await handleRedirectCallback()) {
      setState('auth', { status: 'connected' });
      return;
    }
  } catch (err) {
    notifyError(err); // then fall through — an older session may still be valid
  } finally {
    // Strip ?code / ?state / ?error so a reload doesn't replay the callback
    if (window.location.search) window.history.replaceState({}, document.title, window.location.pathname);
  }

  // Stored token still valid, or refreshable via the stored refresh token
  // (a refresh can fail offline — stay disconnected rather than break startup)
  const token = await getValidToken().catch(() => null);
  setState('auth', { status: token ? 'connected' : 'disconnected' });
}

if (DEMO) {
  const demo = await import('./dev/demo.js');
  libraryLoader = demo.loadDemoLibrary;
  recordPlayer = demo.playDemoRecord;
  seeker = demo.seekDemo;
  demo.runDemo(DEMO, new URLSearchParams(window.location.search));
} else {
  await init();
}
