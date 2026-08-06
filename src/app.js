import { redirectToSpotifyAuth, getAccessToken } from './auth.js';
import { state, subscribe } from './state.js';
import { toggleTimer, formatTime, requestNotificationPermission } from './timer.js';
import { play, pause, next, previous } from './player.js';
import { startSync } from './sync.js';

// DOM refs
const vinyl = document.getElementById('vinyl');
const tonearm = document.getElementById('tonearm');
const btnPlay = document.getElementById('btn-play');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnLogin = document.getElementById('btn-login');
const btnTimerToggle = document.getElementById('btn-timer-toggle');
const timerDisplay = document.getElementById('timer-display');
const albumArt = document.getElementById('album-art');
const ambientBg = document.getElementById('ambient-bg');

// Single render function — the only place that touches the DOM
function render(s) {
  vinyl.classList.toggle('playing', s.isPlaying);
  tonearm.classList.toggle('engaged', s.isPlaying);
  btnPlay.textContent = s.isPlaying ? '⏸' : '▶';

  btnPrev.disabled = !s.isConnected;
  btnNext.disabled = !s.isConnected;
  btnPlay.disabled = !s.isConnected;

  if (s.trackImage) {
    albumArt.src = s.trackImage;
    ambientBg.style.backgroundImage = `url('${s.trackImage}')`;
  }
  document.getElementById('track-title').textContent = s.trackTitle || 'No Track Selected';
  document.getElementById('track-artist').textContent = s.trackArtist || 'Connect to Spotify to start playing';

  timerDisplay.textContent = formatTime(s.timerSecondsLeft);
  timerDisplay.classList.toggle('break-mode', s.timerMode === 'break');
  btnTimerToggle.textContent = s.timerRunning ? 'Pause Session' : 'Start Session';

  btnLogin.textContent = s.isConnected ? 'Connected ✓' : 'Connect Spotify';
}

subscribe(render);
render(state); // initial paint

// Playback controls
async function handleTogglePlay() {
  try {
    state.isPlaying ? await pause() : await play();
    // No optimistic update — next sync poll confirms real state
  } catch (err) {
    handlePlaybackError(err);
  }
}

function handlePlaybackError(err) {
  const messages = {
    NO_ACTIVE_DEVICE: 'Open Spotify on a device first, then try again.',
    PREMIUM_REQUIRED: 'Playback control requires Spotify Premium.',
    UNAUTHORIZED: 'Session expired — please reconnect.',
  };
  alert(messages[err.message] || 'Playback action failed.');
}

btnPlay.addEventListener('click', handleTogglePlay);
btnNext.addEventListener('click', () => next().catch(handlePlaybackError));
btnPrev.addEventListener('click', () => previous().catch(handlePlaybackError));

// Timer controls
btnTimerToggle.addEventListener('click', toggleTimer);

// Login — request notification permission during this real user gesture
btnLogin.addEventListener('click', () => {
  requestNotificationPermission();
  redirectToSpotifyAuth();
});

// Spotify redirect callback
async function handleCallback() {
  const code = new URLSearchParams(window.location.search).get('code');
  if (!code) return;

  const token = await getAccessToken(code);
  window.history.replaceState({}, document.title, '/');
  if (token) {
    state.isConnected = true; // direct set is fine pre-render; subscribe already registered
    render(state);
    startSync(); // begins polling currently-playing, drives all subsequent state updates
  }
}

await handleCallback();