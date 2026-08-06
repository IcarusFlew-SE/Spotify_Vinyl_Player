import { redirectToSpotifyAuth, getAccessToken } from './auth.js';

// DOM Elements
const vinyl = document.getElementById('vinyl');
const tonearm = document.getElementById('tonearm');
const btnPlay = document.getElementById('btn-play');
const btnLogin = document.getElementById('btn-login');
const albumArt = document.getElementById('album-art');
const ambientBg = document.getElementById('ambient-bg');

let isPlaying = false;

// Toggles Vinyl Spin and Tonearm Drop
function togglePlayback() {
  isPlaying = !isPlaying;

  if (isPlaying) {
    vinyl.classList.add('playing');
    tonearm.classList.add('engaged');
    btnPlay.textContent = '⏸';
  } else {
    vinyl.classList.remove('playing');
    tonearm.classList.remove('engaged');
    btnPlay.textContent = '▶';
  }
}

// Dynamically Update Album Art and Ambient Background Mood
function updateTrackDisplay(imageUrl, title, artist) {
  albumArt.src = imageUrl;
  ambientBg.style.backgroundImage = `url('${imageUrl}')`;
  document.getElementById('track-title').textContent = title;
  document.getElementById('track-artist').textContent = artist;
}

// Handle Spotify Redirect Callback
async function handleCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  if (code) {
    const token = await getAccessToken(code);
    // Clear URL parameters
    window.history.replaceState({}, document.title, "/");
    if (token) {
      btnLogin.textContent = 'Connected ✓';
      fetchCurrentlyPlaying(token);
    }
  }
}

// Fetch Currently Playing Track Metadata from Spotify
async function fetchCurrentlyPlaying(token) {
  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (res.status === 200) {
      const data = await res.json();
      const track = data.item;
      updateTrackDisplay(
        track.album.images[0].url,
        track.name,
        track.artists.map(a => a.name).join(', ')
      );
      if (data.is_playing && !isPlaying) togglePlayback();
    }
  } catch (err) {
    console.error('Failed to fetch Spotify track info:', err);
  }
}

// Event Listeners
btnPlay.addEventListener('click', togglePlayback);
btnLogin.addEventListener('click', redirectToSpotifyAuth);

// Initialize App
await handleCallback();