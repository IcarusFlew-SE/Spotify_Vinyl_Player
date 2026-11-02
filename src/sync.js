import { spotifyFetch } from './api/client.js';
import { pickImage } from './api/images.js';
import { setState, IDLE_PLAYBACK } from './state.js';
import { notifyError } from './messages.js';

const POLL_MS = 2000; // well inside Spotify's rate limits
const FAST_POLL_MS = 1000; // while synced lyrics are on screen — tighter correction of the position estimate
let pollMs = POLL_MS;
let intervalId = null;
let inFlight = false;
let repollQueued = false;

export function startSync() {
  if (intervalId) return;
  intervalId = setInterval(poll, pollMs);
  poll();
}

// Lyrics ask for faster polling only while they're visible and playing
export function setFastPolling(fast) {
  const next = fast ? FAST_POLL_MS : POLL_MS;
  if (next === pollMs) return;
  pollMs = next;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = setInterval(poll, pollMs);
  }
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
    const sentAt = Date.now();
    const data = await spotifyFetch('/me/player/currently-playing', {
      query: { additional_types: 'episode' },
    });
    // Spotify measured progress_ms somewhere between sending and receiving — the midpoint is the best
    // estimate, so request latency doesn't shift the progress bar or the lyrics
    const measuredAt = sentAt + (Date.now() - sentAt) / 2;

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
      trackId: item.id ?? item.uri,
      trackTitle: item.name,
      trackArtist: item.artists ? item.artists.map((a) => a.name).join(', ') : item.show?.name,
      primaryArtist: item.artists?.[0]?.name ?? null, // null for podcasts — no lyrics lookup
      contextUri: data.context?.uri ?? null,
      device: 'remote',
      album: item.album?.name ?? item.show?.name ?? null,
      trackUrl: item.external_urls?.spotify ?? null,
      artUrl: pickImage(images, 300),
      artThumbUrl: pickImage(images, 64),
      progressMs: data.progress_ms ?? 0,
      progressAt: measuredAt,
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
