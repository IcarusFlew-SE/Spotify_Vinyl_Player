import { getValidToken } from '../auth/auth.js';
import { timeoutSignal } from '../lib/signal.js';

const BASE = 'https://api.spotify.com/v1';
const DEFAULT_RETRY_AFTER_S = 5; // used when Retry-After is missing or unreadable
const TIMEOUT_MS = 8000; // a stuck request counts as a network error instead of freezing its caller

let blockedUntil = 0; // rate-limit cooldown, shared by every caller

export class SpotifyError extends Error {
  constructor(code, { status = null, retryAfter = null } = {}) {
    super(code); // message stays the code, so `err.message` checks keep working
    this.name = 'SpotifyError';
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

// Every Spotify Web API call goes through here
export async function spotifyFetch(path, { method = 'GET', body, query } = {}) {
  // Fail fast during a rate-limit cooldown — hitting the API now only extends the block
  const waitMs = blockedUntil - Date.now();
  if (waitMs > 0) {
    throw new SpotifyError('RATE_LIMITED', { status: 429, retryAfter: Math.ceil(waitMs / 1000) });
  }

  // Paged responses hand back an absolute `next` URL — accept those as-is (Spotify API only)
  const base = path.startsWith(BASE) ? path : `${BASE}${path}`;
  const url = query ? `${base}?${new URLSearchParams(query)}` : base;

  let res = await send(url, method, body, false);
  // Token looked valid but was rejected (revoked, clock skew) — refresh once and retry
  if (res.status === 401) res = await send(url, method, body, true);

  if (res.ok) return parseBody(res);
  throw await toError(res, path);
}

async function getToken(forceRefresh) {
  let token;
  try {
    token = await getValidToken({ force: forceRefresh });
  } catch {
    throw new SpotifyError('NETWORK_ERROR');
  }
  if (!token) throw new SpotifyError('UNAUTHORIZED');
  return token;
}

async function send(url, method, body, forceRefresh) {
  const token = await getToken(forceRefresh);
  try {
    return await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: timeoutSignal(TIMEOUT_MS),
    });
  } catch {
    // offline, DNS, CORS or timeout — all transient from the caller's point of view
    throw new SpotifyError('NETWORK_ERROR');
  }
}

// 204 and empty 200/202 bodies (common on play/next) come back as null
async function parseBody(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function toError(res, path) {
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After')) || DEFAULT_RETRY_AFTER_S;
    blockedUntil = Date.now() + retryAfter * 1000;
    return new SpotifyError('RATE_LIMITED', { status: 429, retryAfter });
  }

  // Player endpoints explain themselves via error.reason — trust that over the bare status
  let reason = null;
  let message = '';
  try {
    const error = (await res.json())?.error;
    reason = error?.reason ?? null;
    message = typeof error?.message === 'string' ? error.message : '';
  } catch {
    // non-JSON error body
  }
  return new SpotifyError(codeFor(res.status, reason, path, message), { status: res.status });
}

// Development-mode apps refuse every call for accounts not added under User Management:
// "Check settings on developer.spotify.com/dashboard, the user may not be registered."
const NOT_REGISTERED = /not be registered|not registered|not approved/i;

function codeFor(status, reason, path, message) {
  if (reason === 'PREMIUM_REQUIRED' || reason === 'NO_ACTIVE_DEVICE') return reason;
  if (status === 403 && NOT_REGISTERED.test(message)) return 'USER_NOT_REGISTERED';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'RESTRICTED';
  if (status === 404) return path.includes('/me/player') ? 'NO_ACTIVE_DEVICE' : 'NOT_FOUND';
  if (status >= 500) return 'SPOTIFY_UNAVAILABLE';
  return 'REQUEST_FAILED';
}
