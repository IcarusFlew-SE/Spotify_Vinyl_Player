import { state, setState, EMPTY_TRACKS } from '../../state.js';

// Loads track lists into the `preview` slice (the crate's selected record) or the `context` slice
// (what's playing). The fetchers are injected so demo mode can serve fixtures.
let fetchers = null;
const cache = new Map(); // record uri -> { items, next }

export function setTrackFetchers(f) {
  fetchers = f; // { tracks(record, next), contextRecord(uri), liked() }
}

async function firstPage(record) {
  if (cache.has(record.uri)) return cache.get(record.uri);
  // Liked songs aren't a Spotify context with its own track endpoint — reuse the library list
  const page =
    record.kind === 'collection'
      ? { items: await fetchers.liked(), next: null }
      : await fetchers.tracks(record);
  cache.set(record.uri, page);
  return page;
}

export async function loadTracks(slice, record) {
  if (!record) return setState(slice, { ...EMPTY_TRACKS });
  if (state[slice].record?.uri === record.uri && state[slice].status === 'ready') return;
  setState(slice, { ...EMPTY_TRACKS, record, status: 'loading' });
  try {
    const page = await firstPage(record);
    if (state[slice].record?.uri !== record.uri) return; // superseded while loading
    setState(slice, { status: 'ready', items: page.items, next: page.next });
  } catch (err) {
    if (state[slice].record?.uri !== record.uri) return;
    // Spotify-owned editorial playlists refuse track listing for new apps
    const refused = err.code === 'RESTRICTED' || err.code === 'NOT_FOUND';
    setState(slice, { status: refused ? 'unsupported' : 'error' });
  }
}

let loadingMore = false;
export async function loadMoreTracks(slice) {
  const list = state[slice];
  if (!list.next || loadingMore) return;
  loadingMore = true;
  try {
    const page = await fetchers.tracks(list.record, list.next);
    if (state[slice].record?.uri !== list.record.uri) return;
    const items = [...state[slice].items, ...page.items];
    setState(slice, { items, next: page.next });
    cache.set(list.record.uri, { items, next: page.next });
  } catch {
    // keep what's shown; scrolling to the end again retries
  } finally {
    loadingMore = false;
  }
}

// The Tracks tab follows whatever is playing
let contextUri;
export async function followContext(uri) {
  if (uri === contextUri) return;
  contextUri = uri;
  if (!uri) return setState('context', { ...EMPTY_TRACKS });
  try {
    const record = await fetchers.contextRecord(uri);
    if (uri !== contextUri) return;
    if (!record) return setState('context', { ...EMPTY_TRACKS, status: 'unsupported' });
    await loadTracks('context', record);
  } catch {
    if (uri === contextUri) setState('context', { ...EMPTY_TRACKS, status: 'error' });
  }
}

export function resetTracks() {
  cache.clear();
  contextUri = undefined;
  setState('preview', { ...EMPTY_TRACKS });
  setState('context', { ...EMPTY_TRACKS });
}
