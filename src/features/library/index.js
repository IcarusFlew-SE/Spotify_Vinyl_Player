import { state, setState } from '../../state.js';
import { hasScopes, LIBRARY_SCOPES } from '../../auth/auth.js';
import { fetchLibrary } from '../../api/library.js';
import { notifyError } from '../../messages.js';
import { LruCache } from '../../lib/lru.js';
import * as db from '../../lib/db.js';

const TTL_MS = 5 * 60 * 1000; // switching tabs back within 5 minutes reuses the list, no request
const KEEP_MS = 7 * 24 * 3600_000; // the stored shelf shown at startup (then refreshed in the background)
const memory = new LruCache(3, TTL_MS); // kind -> items (playlists / albums / liked)

// Cheap identity check, so an unchanged refresh doesn't re-render the 3D shelf
const sameItems = (a, b) =>
  a.length === b.length &&
  a.every((r, i) => r.id === b[i].id && r.meta === b[i].meta && r.artUrl === b[i].artUrl);

/**
 * Stale-while-revalidate: memory (fresh) → shown at once; else the stored shelf is shown at once
 * while Spotify is asked in the background. Only a real difference re-renders.
 */
export async function loadLibrary(kind, { force = false } = {}) {
  if (!hasScopes(LIBRARY_SCOPES)) {
    setState('library', { kind, status: 'needs-scope', items: [], selected: 0 });
    return;
  }

  const hit = !force && memory.get(kind);
  if (hit) {
    setState('library', { kind, status: 'ready', items: hit, selected: 0 });
    return;
  }

  setState('library', { kind, status: 'loading', items: [], selected: 0 });
  const stored = force ? undefined : await db.get(db.STORES.library, kind);
  if (stored?.length && state.library.kind === kind && state.library.status === 'loading') {
    setState('library', { status: 'ready', items: stored });
  }

  try {
    const items = await fetchLibrary(kind);
    memory.set(kind, items);
    db.set(db.STORES.library, kind, items, KEEP_MS);
    // The user may have switched tabs while this was loading
    if (state.library.kind !== kind) return;
    const shown = state.library.status === 'ready' ? state.library.items : null;
    if (shown && sameItems(shown, items)) return;
    // Keep the record the user had picked from the stored shelf selected, wherever it moved to
    const pickedId = shown?.[state.library.selected]?.id;
    const selected = Math.max(
      0,
      items.findIndex((r) => r.id === pickedId),
    );
    setState('library', { status: 'ready', items, selected });
  } catch (err) {
    if (state.library.kind !== kind) return;
    // A stored shelf is still on screen — keep it, quietly (offline, Spotify blip)
    if (state.library.status === 'ready') return;
    setState('library', { status: 'error' });
    if (err.code !== 'UNAUTHORIZED') notifyError(err, 'Couldn’t load your records.');
  }
}

// After a reconnect: reload a shelf that failed
export function retryLibrary() {
  if (state.library.status === 'error') loadLibrary(state.library.kind, { force: true });
}

// On disconnect. The stored shelf belongs to this account — remove it, so the next person to log in
// on this browser never sees it.
export function resetLibrary() {
  memory.clear();
  db.clear(db.STORES.library);
  setState('library', { status: 'idle', items: [], selected: 0 });
}
