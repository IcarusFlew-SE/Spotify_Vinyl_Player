import { subscribe, canControl } from '../state.js';
import { announce } from './announcer.js';

// Player card text and transport, the header's connect button, and the account chip
export function mountControls({ onTogglePlay, onNext, onPrev, onLogin, onLogout, onPlayHere, canPlayHere }) {
  const meta = document.querySelector('.player__meta');
  const title = document.getElementById('track-title');
  const artist = document.getElementById('track-artist');
  const btnPlay = document.getElementById('btn-play');
  const playIcon = document.getElementById('play-icon');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const hint = document.getElementById('transport-hint');
  const btnLogin = document.getElementById('btn-login');
  const accountMenu = document.querySelector('.account__menu');
  const btnDisconnect = document.getElementById('btn-disconnect');
  const btnDevice = document.getElementById('btn-device');
  const deviceText = document.getElementById('device-text');

  title.classList.add('skeleton-text');
  artist.classList.add('skeleton-text');
  let announcedTrack = null;
  let announcedOffline = null;

  function render(_, s) {
    const auth = s.auth.status;
    const connected = auth === 'connected';
    const p = s.playback;
    const offline = connected && !s.net.online;
    const loading = auth === 'unknown' || (connected && p.status === 'loading' && !offline);

    // Copy for each state; skeleton bars replace the text while loading (DESIGN §8)
    meta.setAttribute('aria-busy', String(loading));
    if (loading) {
      title.textContent = 'Loading track';
      artist.textContent = 'Loading artist';
    } else if (offline && p.status !== 'ready') {
      // Started offline: say so instead of an endless loading shimmer
      title.textContent = 'You’re offline';
      artist.textContent = 'Studify will reconnect by itself when the connection is back.';
    } else if (p.status === 'ready') {
      title.textContent = p.trackTitle;
      artist.textContent = [p.trackArtist, p.album].filter(Boolean).join(' · ');
    } else if (connected) {
      title.textContent = 'Put a record on';
      artist.textContent = 'Pick one from your records — Spotify just needs to be open.';
    } else {
      title.textContent = 'No Track Selected';
      artist.textContent = 'Connect to Spotify to start playing';
    }

    playIcon.setAttribute('href', p.isPlaying ? '#i-pause' : '#i-play');
    btnPlay.setAttribute('aria-label', p.isPlaying ? 'Pause' : 'Play');
    // Follow mode: Spotify doesn't let apps control free accounts — Studify shows, the Spotify app controls
    const control = canControl(s);
    btnPrev.disabled = !control;
    btnNext.disabled = !control;
    btnPlay.disabled = !control;

    // The disabled controls explain themselves (DESIGN B3)
    hint.textContent =
      auth === 'disconnected'
        ? 'Connect Spotify to use the controls.'
        : offline
          ? 'Offline — showing the last song. Reconnecting automatically…'
          : connected && !control
            ? 'Free account: play, pause and skip in the Spotify app — Studify follows along.'
            : '';

    // "Play here" (Premium, computer browsers): this tab becomes the Spotify device.
    // Shown unless the account is known to be Free — Spotify no longer reports the plan up front
    btnDevice.hidden = !(control && canPlayHere());
    const here = p.device === 'browser';
    btnDevice.setAttribute('aria-pressed', String(here));
    deviceText.textContent = here ? 'Playing in this browser' : 'Play here';
    btnDevice.title = here
      ? 'To move the music back, pick a device in the Spotify app'
      : 'Play the music in this tab — tightest lyric sync';
    btnLogin.hidden = auth !== 'disconnected';
    if (!connected) accountMenu.open = false;

    if (offline !== announcedOffline) {
      if (offline || announcedOffline !== null)
        announce(offline ? 'Offline. Reconnecting automatically.' : 'Back online.');
      announcedOffline = offline;
    }

    if (p.status === 'ready' && p.trackTitle !== announcedTrack) {
      announcedTrack = p.trackTitle;
      announce(`Now playing: ${p.trackTitle} by ${p.trackArtist}`);
    }
  }

  subscribe('auth', render);
  subscribe('playback', render);
  subscribe('net', render);

  btnPlay.addEventListener('click', onTogglePlay);
  btnNext.addEventListener('click', onNext);
  btnPrev.addEventListener('click', onPrev);
  btnLogin.addEventListener('click', onLogin);
  btnDevice.addEventListener('click', () => {
    if (btnDevice.getAttribute('aria-pressed') !== 'true') onPlayHere();
  });
  btnDisconnect.addEventListener('click', () => {
    accountMenu.open = false;
    onLogout();
  });
}
