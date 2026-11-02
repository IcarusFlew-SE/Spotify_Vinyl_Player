import { subscribe, setState } from '../../state.js';
import { parseLrc } from './lrc.js';

// Keeps the `lyrics` slice in step with the current track.
// status: 'idle' (no track) | 'loading' | 'synced' | 'plain' | 'instrumental' | 'none' | 'error'
const CACHE_LIMIT = 100;
const cache = new Map(); // track id -> lyrics slice values

let fetcher = null; // ({ title, artist, album, durationMs }) => { synced, plain, instrumental } | null

export function setLyricsFetcher(fn) {
  fetcher = fn;
}

function toSlice(trackId, result) {
  if (!result) return { trackId, status: 'none', lines: [], plain: null };
  if (result.instrumental) return { trackId, status: 'instrumental', lines: [], plain: null };
  const lines = parseLrc(result.synced);
  if (lines.length) return { trackId, status: 'synced', lines, plain: null };
  if (result.plain) return { trackId, status: 'plain', lines: [], plain: result.plain };
  return { trackId, status: 'none', lines: [], plain: null };
}

export function startLyricsSync() {
  let current = null;

  subscribe('playback', (p) => {
    const trackId = p.status === 'ready' ? p.trackId : null;
    if (trackId === current) return;
    current = trackId;

    if (!trackId) return setState('lyrics', { trackId: null, status: 'idle', lines: [], plain: null });
    if (!p.primaryArtist) return setState('lyrics', { trackId, status: 'none', lines: [], plain: null }); // podcasts
    if (cache.has(trackId)) return setState('lyrics', cache.get(trackId));

    setState('lyrics', { trackId, status: 'loading', lines: [], plain: null });
    fetcher({ title: p.trackTitle, artist: p.primaryArtist, album: p.album, durationMs: p.durationMs })
      .then((result) => {
        const slice = toSlice(trackId, result);
        if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
        cache.set(trackId, slice);
        if (trackId === current) setState('lyrics', slice);
      })
      .catch(() => {
        // not cached — the next play of this song tries again
        if (trackId === current) setState('lyrics', { trackId, status: 'error', lines: [], plain: null });
      });
  });
}
