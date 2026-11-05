// Tiny key-value store on IndexedDB, with per-entry expiry. No library: one database, a few stores.
// Fail-safe by design: wherever IndexedDB is missing or refuses (some private-browsing modes, storage
// full, blocked upgrade), every call quietly resolves `undefined` and the app runs memory-only, as before.
//
// Kill switch: store names carry a version. Bump it (e.g. 'lyrics-v2') and DB_VERSION, and the old
// stores are deleted on the next visit — no stale format can break a new release.
const DB_NAME = 'studify';
const DB_VERSION = 1;
export const STORES = { lyrics: 'lyrics-v1', library: 'library-v1' };

let dbPromise = null;

function open() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  dbPromise ??= new Promise((resolve) => {
    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      return resolve(null);
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      const wanted = Object.values(STORES);
      for (const name of [...db.objectStoreNames]) if (!wanted.includes(name)) db.deleteObjectStore(name);
      for (const name of wanted) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
  return dbPromise;
}

// One request in one transaction; resolves its result once the transaction has committed
function run(store, mode, makeRequest) {
  return open().then(
    (db) =>
      db &&
      new Promise((resolve) => {
        try {
          const tx = db.transaction(store, mode);
          const req = makeRequest(tx.objectStore(store));
          tx.oncomplete = () => resolve(req?.result);
          tx.onerror = () => resolve(undefined);
          tx.onabort = () => resolve(undefined);
        } catch {
          resolve(undefined);
        }
      }),
  );
}

export async function get(store, key) {
  const entry = await run(store, 'readonly', (s) => s.get(key));
  if (!entry) return undefined;
  if (Date.now() > entry.expires) {
    del(store, key);
    return undefined;
  }
  return entry.value;
}

export const set = (store, key, value, ttlMs) =>
  run(store, 'readwrite', (s) => s.put({ value, expires: Date.now() + ttlMs }, key));

export const del = (store, key) => run(store, 'readwrite', (s) => s.delete(key));

export const clear = (store) => run(store, 'readwrite', (s) => s.clear());

// Drop expired entries — run once, when the browser is idle, so storage can't grow without bound
export function prune(store) {
  return run(store, 'readwrite', (s) => {
    const req = s.openCursor();
    const now = Date.now();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return;
      if (now > cursor.value?.expires) cursor.delete();
      cursor.continue();
    };
    return null;
  });
}
