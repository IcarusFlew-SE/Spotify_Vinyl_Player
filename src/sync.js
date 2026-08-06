import { getValidToken } from './auth.js';
import { state, setState } from './state.js';

const POLL_MS = 50;
let intervalId = null;
let lastTrackId = null;

export function startSync() {
  if (intervalId) return;
  poll();
  intervalId = setInterval(poll, POLL_MS);
}

export function stopSync() {
  clearInterval(intervalId);
  intervalId = null;
}

async function poll() {
  const token = await getValidToken();
  if (!token) return;

  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 204) {
      // Nothing playing — distinct from an error, don't treat as one
      setState({ isPlaying: false });
      return;
    }
    if (!res.ok) return;

    const data = await res.json();
    const track = data.item;
    if (!track) return;

    // Only push a state update (and re-render) when something actually changed
    if (track.id !== lastTrackId) {
      lastTrackId = track.id;
      setState({
        trackTitle: track.name,
        trackArtist: track.artists.map(a => a.name).join(', '),
        trackImage: track.album.images[0]?.url,
      });
    }
    if (data.is_playing !== state.isPlaying) {
      setState({ isPlaying: data.is_playing });
    }
  } catch (err) {
    console.error('Sync poll failed:', err);
  }
}