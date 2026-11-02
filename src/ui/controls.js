import { subscribe } from '../state.js';
import { announce } from './announcer.js';

// Player card text and transport, the header's connect button, and the account chip
export function mountControls({ onTogglePlay, onNext, onPrev, onLogin, onLogout }) {
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

  title.classList.add('skeleton-text');
  artist.classList.add('skeleton-text');
  let announcedTrack = null;

  function render(_, s) {
    const auth = s.auth.status;
    const connected = auth === 'connected';
    const p = s.playback;
    const loading = auth === 'unknown' || (connected && p.status === 'loading');

    // Copy for each state; skeleton bars replace the text while loading (DESIGN §8)
    meta.setAttribute('aria-busy', String(loading));
    if (loading) {
      title.textContent = 'Loading track';
      artist.textContent = 'Loading artist';
    } else if (p.status === 'ready') {
      title.textContent = p.trackTitle;
      artist.textContent = [p.trackArtist, p.album].filter(Boolean).join(' · ');
    } else if (connected) {
      title.textContent = 'Put a record on';
      artist.textContent = 'Pick one from your records, or play something in Spotify.';
    } else {
      title.textContent = 'No Track Selected';
      artist.textContent = 'Connect to Spotify to start playing';
    }

    playIcon.setAttribute('href', p.isPlaying ? '#i-pause' : '#i-play');
    btnPlay.setAttribute('aria-label', p.isPlaying ? 'Pause' : 'Play');
    btnPrev.disabled = !connected;
    btnNext.disabled = !connected;
    btnPlay.disabled = !connected;

    // The disabled controls explain themselves (DESIGN B3)
    hint.textContent = auth === 'disconnected' ? 'Connect Spotify to use the controls.' : '';
    btnLogin.hidden = auth !== 'disconnected';
    if (!connected) accountMenu.open = false;

    if (p.status === 'ready' && p.trackTitle !== announcedTrack) {
      announcedTrack = p.trackTitle;
      announce(`Now playing: ${p.trackTitle} by ${p.trackArtist}`);
    }
  }

  subscribe('auth', render);
  subscribe('playback', render);

  btnPlay.addEventListener('click', onTogglePlay);
  btnNext.addEventListener('click', onNext);
  btnPrev.addEventListener('click', onPrev);
  btnLogin.addEventListener('click', onLogin);
  btnDisconnect.addEventListener('click', () => {
    accountMenu.open = false;
    onLogout();
  });
}
