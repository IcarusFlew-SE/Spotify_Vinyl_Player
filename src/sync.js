import { spotifyFetch } from './api/client.js';
import { pickImage } from './api/images.js';
import { setState, IDLE_PLAYBACK } from './state.js';
import { notifyError } from './messages.js';

const POLL_MS = 2000; // well inside Spotify's rate limits
let intervalId = null;
let inFlight = false;
let repollQueued = false;

export function startSync() {
  if (intervalId) return;
  intervalId = setInterval(poll, POLL_MS);
  poll();
}

export function stopSync() {
  clearInterval(intervalId);
  intervalId = null;
  repollQueued = false;
}

// Poll immediately, e.g. right after a playback command
export function syncNow() {
  poll();
}

async function poll() {
  if (!intervalId) return; // stopped — e.g. a queued re-poll after disconnect
  // Never stack requests — if one is in flight, run once more after it lands
  if (inFlight) {
    repollQueued = true;
    return;
  }
  inFlight = true;

  try {
    const data = await spotifyFetch('/me/player/currently-playing', {
      query: { additional_types: 'episode' },
    });

    if (!data) {
      // 204: nothing playing — distinct from an error, don't treat as one
      setState('playback', IDLE_PLAYBACK);
      return;
    }

    const item = data.item;
    if (!item) return; // ads, or a private session

    // The store ignores unchanged values, so pushing the full snapshot is cheap.
    // Tracks carry album + artists; podcast episodes carry show + their own images
    const images = item.album?.images ?? item.images;
    setState('playback', {
      status: 'ready',
      isPlaying: data.is_playing,
      trackTitle: item.name,
      trackArtist: item.artists ? item.artists.map((a) => a.name).join(', ') : item.show?.name,
      album: item.album?.name ?? item.show?.name ?? null,
      trackUrl: item.external_urls?.spotify ?? null,
      artUrl: pickImage(images, 300),
      artThumbUrl: pickImage(images, 64),
      progressMs: data.progress_ms ?? 0,
      progressAt: Date.now(),
      durationMs: item.duration_ms ?? 0,
    });
  } catch (err) {
    if (err.code === 'UNAUTHORIZED') {
      setState('auth', { status: 'disconnected' }); // app.js stops syncing on this
      notifyError(err);
      return;
    }
    // Rate limits and network blips are expected — skip this tick, the next poll retries
    if (err.code !== 'RATE_LIMITED' && err.code !== 'NETWORK_ERROR') {
      console.error('Sync poll failed:', err);
    }
  } finally {
    inFlight = false;
    if (repollQueued) {
      repollQueued = false;
      poll();
    }
  }
}
