import { notify } from './state.js';

// User-facing copy for error codes from the API client (SpotifyError) and auth (AuthError)
const MESSAGES = {
  NO_ACTIVE_DEVICE: 'Open Spotify on a device first, then try again.',
  PREMIUM_REQUIRED: 'Playback control requires Spotify Premium.',
  UNAUTHORIZED: 'Session expired — please reconnect.',
  RESTRICTED: "Spotify won't allow that right now.",
  NETWORK_ERROR: 'Can’t reach Spotify — check your connection.',
  SPOTIFY_UNAVAILABLE: 'Spotify is having trouble — try again shortly.',
  AUTH_DENIED: 'Spotify access was declined.',
  AUTH_STATE_MISMATCH: 'Login could not be verified — please connect again.',
  AUTH_FAILED: 'Spotify login failed — please try again.',
  AUTH_NOT_CONFIGURED: 'Spotify client ID is missing — set VITE_SPOTIFY_CLIENT_ID in .env.',
};

// Transient conditions warn; everything else is an error
const WARNING_CODES = new Set(['RATE_LIMITED', 'NETWORK_ERROR', 'SPOTIFY_UNAVAILABLE', 'NO_ACTIVE_DEVICE']);

export function errorMessage(err, fallback = 'Something went wrong.') {
  if (err?.code === 'RATE_LIMITED') return `Spotify is busy — try again in ${err.retryAfter}s.`;
  return MESSAGES[err?.code] || fallback;
}

export function notifyError(err, fallback) {
  notify(errorMessage(err, fallback), WARNING_CODES.has(err?.code) ? 'warning' : 'error');
}
