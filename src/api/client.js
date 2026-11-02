import { getValidToken } from '../auth/auth.js';

const BASE = 'https://api.spotify.com/v1';
const DEFAULT_RETRY_AFTER_S = 5; // used when Retry-After is missing or unreadable

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

  const url = query ? `${BASE}${path}?${new URLSearchParams(query)}` : `${BASE}${path}`;

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
    });
  } catch {
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
  try {
    reason = (await res.json())?.error?.reason ?? null;
  } catch {
    // non-JSON error body
  }
  return new SpotifyError(codeFor(res.status, reason, path), { status: res.status });
}

function codeFor(status, reason, path) {
  if (reason === 'PREMIUM_REQUIRED' || reason === 'NO_ACTIVE_DEVICE') return reason;
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'RESTRICTED';
  if (status === 404) return path.startsWith('/me/player') ? 'NO_ACTIVE_DEVICE' : 'NOT_FOUND';
  if (status >= 500) return 'SPOTIFY_UNAVAILABLE';
  return 'REQUEST_FAILED';
}
