import { state, setState } from '../../state.js';
import { hasScopes, LIBRARY_SCOPES } from '../../auth/auth.js';
import { fetchLibrary } from '../../api/library.js';
import { notifyError } from '../../messages.js';

const TTL_MS = 5 * 60 * 1000; // switching tabs back within 5 minutes reuses the list
const cache = new Map(); // kind -> { items, at }

export async function loadLibrary(kind, { force = false } = {}) {
  if (!hasScopes(LIBRARY_SCOPES)) {
    setState('library', { kind, status: 'needs-scope', items: [], selected: 0 });
    return;
  }

  const hit = cache.get(kind);
  if (hit && !force && Date.now() - hit.at < TTL_MS) {
    setState('library', { kind, status: 'ready', items: hit.items, selected: 0 });
    return;
  }

  setState('library', { kind, status: 'loading', items: [], selected: 0 });
  try {
    const items = await fetchLibrary(kind);
    cache.set(kind, { items, at: Date.now() });
    // The user may have switched tabs while this was loading
    if (state.library.kind === kind) setState('library', { status: 'ready', items });
  } catch (err) {
    if (state.library.kind === kind) setState('library', { status: 'error' });
    if (err.code !== 'UNAUTHORIZED') notifyError(err, 'Couldn’t load your records.');
  }
}

export function resetLibrary() {
  cache.clear();
  setState('library', { status: 'idle', items: [], selected: 0 });
}
