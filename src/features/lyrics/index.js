import { state, subscribe, setState } from '../../state.js';
import { parseLrc } from './lrc.js';
import { LruCache } from '../../lib/lru.js';
import * as db from '../../lib/db.js';

// Keeps the `lyrics` slice in step with the current track.
// status: 'idle' (no track) | 'loading' | 'synced' | 'plain' | 'instrumental' | 'none' | 'error'
//
// Lookup order: memory → IndexedDB → LRCLIB. Concurrent asks for one song share a single lookup.
const MEMORY_LIMIT = 200; // parsed songs held in memory (~1–3 KB each)
const DEBOUNCE_MS = 250; // rapid skipping only looks up the song you stop on (network only, never cache)
const RETRY_MS = 3000; // one quiet retry after a network error; "not found" is an answer, not an error
const PREFETCH_AT = 0.7; // look up the next song at 70% of this one
const KEEP_FOUND_MS = 30 * 24 * 3600_000; // lyrics rarely change
const KEEP_NONE_MS = 3 * 24 * 3600_000; // "no lyrics" — LRCLIB may add them later

const memory = new LruCache(MEMORY_LIMIT); // trackId -> raw result ({ synced, plain, instrumental } | null)
const inflight = new Map(); // trackId -> Promise<raw result>

let fetcher = null; // ({ title, artist, album, durationMs }) => raw result
let nextFetcher = null; // () => song | null — the song that plays next (for prefetch)

export function setLyricsFetcher(fn) {
  fetcher = fn;
}

export function setNextTrackFetcher(fn) {
  nextFetcher = fn ?? null;
}

const empty = (trackId, status) => ({ trackId, status, lines: [], plain: null });

export function toSlice(trackId, result) {
  if (!result) return empty(trackId, 'none');
  if (result.instrumental) return empty(trackId, 'instrumental');
  const lines = parseLrc(result.synced);
  if (lines.length) return { trackId, status: 'synced', lines, plain: null };
  if (result.plain) return { trackId, status: 'plain', lines: [], plain: result.plain };
  return empty(trackId, 'none');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const skipped = () => Object.assign(new Error('SKIPPED'), { code: 'SKIPPED' });

/**
 * Raw lyrics for a song: memory, then IndexedDB, then LRCLIB (after `debounceMs`, and only if the
 * song is still `wanted()`). Raw results are stored, not parsed lines, so a parser fix applies at once.
 */
export function lookup(song, { debounceMs = 0, wanted = () => true } = {}) {
  const hit = memory.get(song.trackId);
  if (hit !== undefined) return Promise.resolve(hit);
  if (!inflight.has(song.trackId)) {
    const pending = resolveLyrics(song, debounceMs, wanted).finally(() => inflight.delete(song.trackId));
    inflight.set(song.trackId, pending);
  }
  return inflight.get(song.trackId);
}

async function resolveLyrics(song, debounceMs, wanted) {
  const stored = await db.get(db.STORES.lyrics, song.trackId);
  if (stored !== undefined) {
    memory.set(song.trackId, stored.result);
    return stored.result;
  }
  if (debounceMs) await sleep(debounceMs);
  if (!wanted()) throw skipped();

  const result = await fetcher({
    title: song.title,
    artist: song.artist,
    album: song.album,
    durationMs: song.durationMs,
  });
  memory.set(song.trackId, result);
  db.set(db.STORES.lyrics, song.trackId, { result }, result ? KEEP_FOUND_MS : KEEP_NONE_MS);
  return result;
}

// ── Current track ──

let current = null; // trackId being shown
let currentSong = null;
let retryTimer = null;
let prefetchTimer = null;
let prefetchedFor = null;
let lyricsOpened = false; // prefetch only for people who actually use the Lyrics panel

const songOf = (p) => ({
  trackId: p.trackId,
  title: p.trackTitle,
  artist: p.primaryArtist,
  album: p.album,
  durationMs: p.durationMs,
});

function show(song, attempt = 1) {
  lookup(song, { debounceMs: DEBOUNCE_MS, wanted: () => song.trackId === current }).then(
    (result) => {
      if (song.trackId === current) setState('lyrics', toSlice(song.trackId, result));
    },
    (err) => {
      if (song.trackId !== current || err.code === 'SKIPPED') return;
      // Keep "Finding the lyrics…" through one retry, so a blip never shows an error
      if (attempt === 1) retryTimer = setTimeout(() => show(song, 2), RETRY_MS);
      else setState('lyrics', empty(song.trackId, 'error'));
    },
  );
}

// After a reconnect: try again for a song whose lyrics failed (or are still waiting on a retry)
export function retryLyrics() {
  const { status } = state.lyrics;
  if (currentSong && current === currentSong.trackId && (status === 'error' || status === 'loading')) {
    clearTimeout(retryTimer);
    show(currentSong, 2);
  }
}

function schedulePrefetch(p) {
  clearTimeout(prefetchTimer);
  if (!nextFetcher || !lyricsOpened || !p.isPlaying || !p.durationMs || prefetchedFor === p.trackId) return;
  const position = p.progressMs + (Date.now() - p.progressAt);
  const trackId = p.trackId;
  prefetchTimer = setTimeout(() => prefetch(trackId), Math.max(0, PREFETCH_AT * p.durationMs - position));
}

async function prefetch(forTrack) {
  if (forTrack !== current) return;
  prefetchedFor = forTrack;
  try {
    const next = await nextFetcher();
    if (next?.trackId && next.artist && next.trackId !== current) await lookup(next);
  } catch {
    // best effort — the song is looked up normally when it starts
  }
}

export function startLyricsSync() {
  subscribe('panel', (panel) => {
    if (panel.active === 'lyrics') lyricsOpened = true;
  });

  subscribe('playback', (p) => {
    const trackId = p.status === 'ready' ? p.trackId : null;
    if (trackId === current) {
      if (trackId) schedulePrefetch(p); // position or play/pause changed — re-time the prefetch
      return;
    }
    current = trackId;
    currentSong = trackId ? songOf(p) : null;
    clearTimeout(retryTimer);
    clearTimeout(prefetchTimer);

    if (!trackId) return setState('lyrics', empty(null, 'idle'));
    if (!p.primaryArtist) return setState('lyrics', empty(trackId, 'none')); // podcasts

    const hit = memory.get(trackId);
    if (hit !== undefined) setState('lyrics', toSlice(trackId, hit));
    else {
      setState('lyrics', empty(trackId, 'loading'));
      show(currentSong);
    }
    schedulePrefetch(p);
  });

  // Housekeeping once the page is idle: drop expired entries so storage stays small
  const idle = globalThis.requestIdleCallback ?? ((fn) => setTimeout(fn, 5000));
  idle(() => db.prune(db.STORES.lyrics));
}
