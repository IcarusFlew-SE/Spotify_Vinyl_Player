import { generateRandomString, createCodeChallenge } from './pkce.js';

// Spotify API Configurations
export const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || ''; // Your Spotify Client ID (Dev-Dashboard)
export const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:5173/';
export const PLAYBACK_SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-modify-playback-state',
];
// The record crate reads the user's playlists, saved albums and liked songs
export const LIBRARY_SCOPES = ['playlist-read-private', 'playlist-read-collaborative', 'user-library-read'];
export const SCOPES = [...PLAYBACK_SCOPES, ...LIBRARY_SCOPES];

const TOKEN_URL = 'https://accounts.spotify.com/api/token';

export class AuthError extends Error {
  constructor(code, detail = null) {
    super(code); // message stays the code, matching SpotifyError
    this.name = 'AuthError';
    this.code = code;
    this.detail = detail;
  }
}

// 1. Redirect User to Spotify Authorization
export async function redirectToSpotifyAuth() {
  if (!CLIENT_ID) throw new AuthError('AUTH_NOT_CONFIGURED');

  const codeVerifier = generateRandomString(64);
  const codeChallenge = await createCodeChallenge(codeVerifier);
  // `state` ties the callback to this login attempt, so a forged redirect can't log us in.
  // sessionStorage: both values only need to survive this tab's round-trip to Spotify
  const authState = generateRandomString(16);
  sessionStorage.setItem('code_verifier', codeVerifier);
  sessionStorage.setItem('auth_state', authState);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES.join(' '),
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    redirect_uri: REDIRECT_URI,
    state: authState,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// 2. Handle Spotify's redirect back. Returns false when the URL isn't a callback,
// true once tokens are stored; throws AuthError for a denied, forged or failed login
export async function handleRedirectCallback(search = window.location.search) {
  const params = new URLSearchParams(search);
  const code = params.get('code');
  const error = params.get('error');
  if (!code && !error) return false;

  const expectedState = sessionStorage.getItem('auth_state');
  const codeVerifier = sessionStorage.getItem('code_verifier');
  // Single-use — clear before anything can throw
  sessionStorage.removeItem('auth_state');
  sessionStorage.removeItem('code_verifier');

  if (error) throw new AuthError(error === 'access_denied' ? 'AUTH_DENIED' : 'AUTH_FAILED', error);
  if (!expectedState || params.get('state') !== expectedState) throw new AuthError('AUTH_STATE_MISMATCH');

  let response;
  try {
    response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });
  } catch {
    throw new AuthError('NETWORK_ERROR');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new AuthError('AUTH_FAILED', data.error_description || data.error || response.status);
  }
  storeTokenResponse(data);
  return true;
}

// 3. Refresh an expired token.
// Single-flight: concurrent callers share one refresh — parallel refreshes can rotate
// the refresh token out from under each other and log the user out
let refreshInFlight = null;

export function refreshAccessToken() {
  refreshInFlight ??= requestRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function requestRefresh() {
  const refreshToken = localStorage.getItem('spotify_refresh_token');
  if (!refreshToken) return null;

  // A network failure throws here and leaves the session intact — it's transient
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  const data = await response.json().catch(() => ({}));

  if (response.ok && data.access_token) {
    storeTokenResponse(data);
    return data.access_token;
  }

  if (response.status === 400 || response.status === 401) {
    // Another tab may have rotated the refresh token while we waited — use its result
    if (localStorage.getItem('spotify_refresh_token') !== refreshToken) {
      return localStorage.getItem('spotify_token');
    }
    // Refresh token revoked or expired (invalid_grant) — the session is over
    logout();
    return null;
  }

  // Spotify-side failure — keep the session and let the caller retry later
  throw new AuthError('AUTH_REFRESH_UNAVAILABLE', response.status);
}

function storeTokenResponse(data) {
  if (!data.access_token) return;
  localStorage.setItem('spotify_token', data.access_token);
  localStorage.setItem('spotify_token_expires_at', String(Date.now() + data.expires_in * 1000));
  if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
  if (data.scope) localStorage.setItem('spotify_scope', data.scope);
}

// Sessions from before a scope was added don't have it — the user must reconnect to grant it
export function hasScopes(required) {
  const granted = (localStorage.getItem('spotify_scope') || '').split(' ');
  return required.every((scope) => granted.includes(scope));
}

// 4. Get a currently-valid token, refreshing if needed (or when forced, e.g. after a 401)
export async function getValidToken({ force = false } = {}) {
  const expiresAt = Number(localStorage.getItem('spotify_token_expires_at') || 0);
  const token = localStorage.getItem('spotify_token');
  if (!force && token && Date.now() < expiresAt - 30_000) return token;
  return refreshAccessToken();
}

// 5. Forget the session on this device
export function logout() {
  localStorage.removeItem('spotify_token');
  localStorage.removeItem('spotify_token_expires_at');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_scope');
  localStorage.removeItem('code_verifier'); // left behind by builds before 1.2
}
