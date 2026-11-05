import { spotifyFetch } from './api/client.js';
import { pickImage } from './api/images.js';
import { setState, IDLE_PLAYBACK } from './state.js';
import { notifyError } from './messages.js';
import { reportOk, reportNetworkError } from './net.js';

// How long to wait before the next poll — a pure function, so every case is unit-tested.
export const DELAYS = {
  fast: 1000, // synced lyrics on screen — tight correction of the position estimate
  playing: 2000, // well inside Spotify's rate limits, and controls still feel instant
  paused: 4000, // nothing moves; a play pressed on another device still shows within ~4 s
  hidden: 15_000, // nobody is looking; we poll at once when the tab is shown again
  endSlack: 300, // poll just after the song should end, so the next one shows at once
  backoffMax: 30_000,
};
const BACKOFF_AFTER = 3; // failures in a row before slowing down

export function nextDelay(
  { failures = 0, hidden = false, playing = false, fast = false, msToEnd = null, retryAfterMs = 0 },
  random = Math.random,
) {
  if (failures >= BACKOFF_AFTER) {
    // 4 s, 8 s, 16 s, then 30 s — with ±20% jitter so many tabs don't retry in lockstep
    const base = Math.min(DELAYS.backoffMax, DELAYS.playing * 2 ** (failures - BACKOFF_AFTER + 1));
    return Math.round(base * (0.8 + 0.4 * random()));
  }
  let delay = hidden ? DELAYS.hidden : !playing ? DELAYS.paused : fast ? DELAYS.fast : DELAYS.playing;
  if (playing && msToEnd != null && msToEnd >= 0) delay = Math.min(delay, msToEnd + DELAYS.endSlack);
  return Math.max(delay, retryAfterMs);
}

let running = false;
let timer = null;
let inFlight = false;
let repollQueued = false;
let fast = false;
let failures = 0;
let retryAfterMs = 0;
let last = null; // { playing, progressMs, durationMs, at } from the latest successful poll

const isHidden = () => typeof document !== 'undefined' && document.hidden;

function onVisibility() {
  if (running && !isHidden()) poll(); // back in view: catch up now, not after the hidden-tab delay
}

export function startSync() {
  if (running) return;
  running = true;
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
  poll();
}

export function stopSync() {
  running = false;
  clearTimeout(timer);
  timer = null;
  repollQueued = false;
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
}

// Lyrics ask for faster polling only while they're visible and playing
export function setFastPolling(on) {
  if (on === fast) return;
  fast = on;
  if (running && !inFlight) schedule(); // re-time the wait that's already running
}

// Poll immediately, e.g. right after a playback command or when the connection returns
export function syncNow() {
  failures = 0; // an explicit request (user action, reconnect) skips any back-off
  poll();
}

function schedule() {
  clearTimeout(timer);
  if (!running) return;
  const msToEnd = last?.playing ? last.durationMs - (last.progressMs + (Date.now() - last.at)) : null;
  timer = setTimeout(
    poll,
    nextDelay({ failures, hidden: isHidden(), playing: last?.playing, fast, msToEnd, retryAfterMs }),
  );
  retryAfterMs = 0;
}

async function poll() {
  if (!running) return; // stopped — e.g. a queued re-poll after disconnect
  // Never stack requests — if one is in flight, run once more after it lands
  if (inFlight) {
    repollQueued = true;
    return;
  }
  clearTimeout(timer);
  inFlight = true;

  try {
    const sentAt = Date.now();
    const data = await spotifyFetch('/me/player/currently-playing', {
      query: { additional_types: 'episode' },
    });
    // Spotify measured progress_ms somewhere between sending and receiving — the midpoint is the best
    // estimate, so request latency doesn't shift the progress bar or the lyrics
    const measuredAt = sentAt + (Date.now() - sentAt) / 2;
    failures = 0;
    reportOk();

    if (!data) {
      // 204: nothing playing — distinct from an error, don't treat as one
      last = null;
      setState('playback', IDLE_PLAYBACK);
      return;
    }

    const item = data.item;
    last = item
      ? {
          playing: data.is_playing,
          progressMs: data.progress_ms ?? 0,
          durationMs: item.duration_ms ?? 0,
          at: measuredAt,
        }
      : null;
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
    // Expected, transient conditions: skip this tick quietly and let the delay grow
    if (err.code === 'RATE_LIMITED') {
      retryAfterMs = (err.retryAfter ?? 1) * 1000; // waiting out the cooldown, not hammering it
    } else if (err.code === 'NETWORK_ERROR' || err.code === 'SPOTIFY_UNAVAILABLE') {
      failures += 1;
      if (err.code === 'NETWORK_ERROR') reportNetworkError();
    } else {
      failures += 1;
      console.error('Sync poll failed:', err);
    }
  } finally {
    inFlight = false;
    if (repollQueued) {
      repollQueued = false;
      poll();
    } else {
      schedule();
    }
  }
}
