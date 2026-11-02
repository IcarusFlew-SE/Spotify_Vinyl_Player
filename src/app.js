import '@fontsource-variable/archivo/wdth.css'; // one variable file: weight + width axes
import { state, setState, subscribe, isConnected, canControl, IDLE_PLAYBACK } from './state.js';
import {
  redirectToSpotifyAuth,
  handleRedirectCallback,
  getValidToken,
  logout,
  hasScopes,
  PROFILE_SCOPES,
  PLAYER_SCOPES,
} from './auth/auth.js';
import { play, pause, next, previous, seek } from './api/player.js';
import { fetchLibrary, playRecord, fetchTracks, fetchContextRecord, playTrack } from './api/library.js';
import { fetchPlan } from './api/profile.js';
import { fetchLyrics } from './api/lyrics.js';
import { startSync, stopSync, syncNow, setFastPolling } from './sync.js';
import { isSdkSupported, isPlayingHere, playHere, here } from './playback/sdk.js';
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
import {
  setTrackFetchers,
  loadTracks,
  loadMoreTracks,
  followContext,
  resetTracks,
} from './features/tracks/index.js';
import { setLyricsFetcher, startLyricsSync } from './features/lyrics/index.js';
import { notifyError } from './messages.js';
import { mountTheme } from './ui/theme.js';
import { mountDeck } from './ui/deck.js';
import { mountControls } from './ui/controls.js';
import { mountTimerView } from './ui/timer-view.js';
import { mountToast } from './ui/toast.js';
import { mountShortcuts } from './ui/shortcuts.js';
import { mountCrate } from './ui/crate.js';
import { mountProgress } from './ui/progress.js';
import { mountSidePanel } from './ui/side-panel.js';
import { mountNowTracks } from './ui/now-tracks.js';
import { mountLyrics } from './ui/lyrics.js';

// Dev-only design fixtures, e.g. ?demo=golden — see src/dev/demo.js. Compiled out of production builds.
const DEMO = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('demo') : null;

// Everything that talks to Spotify or LRCLIB, in one place — demo mode swaps in fixtures
const services = {
  loadLibrary,
  playRecord: (record, records) => runPlayback(() => playRecord(record, records)),
  playTrack: (record, track, tracks) => runPlayback(() => playTrack(record, track, tracks)),
  seek: (ms) => runPlayback(() => (isPlayingHere() ? here.seek(ms) : seek(ms))),
  fetchPlan,
  fetchLyrics,
  tracks: {
    tracks: fetchTracks,
    contextRecord: fetchContextRecord,
    // Liked songs as track rows (they're already loaded as crate records)
    liked: async () =>
      (await fetchLibrary('liked')).map((r) => ({
        id: r.id,
        uri: r.uri,
        title: r.title,
        artist: r.subtitle,
        durationMs: r.durationMs,
        playable: true,
        url: r.url,
      })),
  },
};

// Session lifecycle — login, reload, expiry and logout all just set auth.status.
// Acts only when the status changes: other auth fields (the plan) arrive later and mustn't restart things.
let sessionStatus = null;
subscribe('auth', ({ status }) => {
  if (status === sessionStatus) return;
  sessionStatus = status;
  if (status === 'connected') {
    setState('playback', { ...IDLE_PLAYBACK, status: 'loading' }); // skeleton until the first poll lands
    if (!DEMO) startSync(); // begins polling currently-playing, drives all subsequent playback updates
    services.loadLibrary(state.library.kind);
    // Free or Premium decides between full control and follow mode; older sessions lack the scope
    if (hasScopes(PROFILE_SCOPES) || DEMO) {
      services.fetchPlan().then(
        (plan) => setState('auth', { plan }),
        () => {},
      );
    }
  } else {
    stopSync();
    setState('playback', IDLE_PLAYBACK);
    if (status === 'disconnected') {
      setState('auth', { plan: 'unknown' });
      resetLibrary();
      resetTracks();
    }
  }
});

// The Tracks tab follows whatever is playing
subscribe('playback', (p) => followContext(p.status === 'ready' ? p.contextUri : null));

// Playback controls — through this tab's player when it's the device, otherwise the Web API
async function runPlayback(action) {
  if (!isConnected()) return false;
  try {
    await action();
    // No optimistic update — poll right away so the real state lands without waiting a full interval
    syncNow();
    return true;
  } catch (err) {
    if (err.code === 'UNAUTHORIZED') setState('auth', { status: 'disconnected' });
    notifyError(err, 'Playback action failed.');
    return false;
  }
}

const viaDevice = (sdkAction, apiAction) => () =>
  runPlayback(() => (isPlayingHere() ? sdkAction() : apiAction()));
const togglePlay = viaDevice(here.togglePlay, () => (state.playback.isPlaying ? pause() : play()));
const playNext = viaDevice(here.next, next);
const playPrev = viaDevice(here.previous, previous);
const ifControllable = (fn) => () => canControl() && fn();

// "Play here": this tab becomes the Spotify device (Premium, computer browsers)
async function startPlayingHere() {
  if (!hasScopes(PLAYER_SCOPES)) {
    // Sessions from before this feature need one more permission — a fresh consent screen
    return redirectToSpotifyAuth().catch(notifyError);
  }
  try {
    await playHere({
      onState: (snapshot) => {
        stopSync(); // events replace polling while this tab plays
        setState('playback', snapshot);
      },
      onLeave: () => {
        setState('playback', { device: 'remote' });
        if (isConnected()) startSync();
      },
    });
  } catch (err) {
    notifyError(err);
  }
}

mountTheme();
startMoodSync();
startLyricsSync();
mountDeck();
mountToast();
initTimer();
mountTimerView({ onToggle: toggleTimer, onReset: resetTimer, onSkip: skipPhase, onLengths: setLengths });
mountProgress({ onSeek: (ms) => services.seek(ms) });
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
  onPlayHere: startPlayingHere,
  canPlayHere: () => !DEMO && isSdkSupported(),
});
mountShortcuts({
  onTogglePlay: ifControllable(togglePlay),
  onNext: ifControllable(playNext),
  onPrev: ifControllable(playPrev),
  onToggleTimer: toggleTimer,
});

const sidePanel = mountSidePanel();
// Playing a record or a track is the user's own action — the one moment the panel may switch itself
const andShowLyrics =
  (play) =>
  async (...args) => {
    if (await play(...args)) sidePanel.requestAutoShow();
  };

mountCrate({
  onSelectKind: (kind) => (isConnected() ? services.loadLibrary(kind) : setState('library', { kind })),
  onRetry: (kind) => services.loadLibrary(kind, { force: true }),
  onPlay: andShowLyrics((record, records) => services.playRecord(record, records)),
  // New scopes need a fresh consent screen; the existing session is replaced on return
  onReconnect: () => redirectToSpotifyAuth().catch(notifyError),
  onOpenTracks: (record) => loadTracks('preview', record),
  onPlayTrack: andShowLyrics((record, track, tracks) => services.playTrack(record, track, tracks)),
  onMoreTracks: () => loadMoreTracks('preview'),
});
mountNowTracks({
  onPlayTrack: (record, track, tracks) => {
    if (canControl()) services.playTrack(record, track, tracks);
    else if (track.url) window.open(track.url, '_blank', 'noopener'); // free account: play it in Spotify
  },
  onMore: () => loadMoreTracks('context'),
});
mountLyrics({
  onSeek: (ms) => services.seek(ms),
  // Faster polling only matters when a Spotify app is playing — this tab's player reports exactly
  onFastSync: (on) => setFastPolling(on && state.playback.device === 'remote'),
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

async function start() {
  if (DEMO) {
    const demo = await import('./dev/demo.js');
    Object.assign(services, demo.services);
    setTrackFetchers(services.tracks);
    setLyricsFetcher(services.fetchLyrics);
    demo.runDemo(DEMO, new URLSearchParams(window.location.search));
  } else {
    setTrackFetchers(services.tracks);
    setLyricsFetcher(services.fetchLyrics);
    await init();
  }
}

await start();
