import { state, notify } from './state.js';

// User-facing copy for error codes from the API client (SpotifyError) and auth (AuthError)
const MESSAGES = {
  NO_ACTIVE_DEVICE: 'Open the Spotify app on any device — no need to play anything — then try again.',
  PREMIUM_REQUIRED:
    'This account is on Spotify Free — Studify will follow along. Play, pause and skip in the Spotify app.',
  UNAUTHORIZED: 'Session expired — please reconnect.',
  RESTRICTED: "Spotify won't allow that right now.",
  USER_NOT_REGISTERED:
    'Your Spotify account isn’t on this Studify’s access list yet. Ask the person who runs Studify to add your Spotify email, then disconnect and connect again.',
  NETWORK_ERROR: 'Can’t reach Spotify — check your connection.',
  SPOTIFY_UNAVAILABLE: 'Spotify is having trouble — try again shortly.',
  AUTH_DENIED: 'Spotify access was declined.',
  AUTH_STATE_MISMATCH: 'Login could not be verified — please connect again.',
  AUTH_FAILED: 'Spotify login failed — please try again.',
  AUTH_NOT_CONFIGURED: 'Spotify client ID is missing — set VITE_SPOTIFY_CLIENT_ID in .env.',
  AUTH_INSECURE_PAGE:
    'Spotify login needs a secure address. On a phone, open the https:// address of Studify (or 127.0.0.1 via USB) — not the computer’s network address.',
  PLAYER_UNAVAILABLE: 'Couldn’t start playing here — try again, or keep using the Spotify app.',
  PLAYER_UNSUPPORTED: 'This browser can’t play Spotify here — keep using the Spotify app.',
};

// Transient conditions warn; everything else is an error
const WARNING_CODES = new Set([
  'RATE_LIMITED',
  'NETWORK_ERROR',
  'SPOTIFY_UNAVAILABLE',
  'NO_ACTIVE_DEVICE',
  'PLAYER_UNAVAILABLE',
  'PLAYER_UNSUPPORTED',
]);

export function errorMessage(err, fallback = 'Something went wrong.') {
  if (err?.code === 'RATE_LIMITED') return `Spotify is busy — try again in ${err.retryAfter}s.`;
  return MESSAGES[err?.code] || fallback;
}

export function notifyError(err, fallback) {
  // While offline, the player card already says so — don't pile a toast on every failed request
  if (err?.code === 'NETWORK_ERROR' && !state.net.online) return;
  // Anything without a known code shows a generic message — keep the details for whoever debugs it
  if (!(err?.code in MESSAGES) && err?.code !== 'RATE_LIMITED') console.error(err);
  notify(errorMessage(err, fallback), WARNING_CODES.has(err?.code) ? 'warning' : 'error');
}
