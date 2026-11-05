import { spotifyFetch } from './client.js';

// Account plan: 'premium' | 'free' | 'unknown'. Needs the user-read-private scope.
// Since Spotify's Feb 2026 change, Development-mode apps no longer get `product`, so this is usually
// 'unknown' — treated like Premium until a "Premium required" reply says otherwise (see app.js).
export async function fetchPlan() {
  const me = await spotifyFetch('/me');
  if (me?.product === 'premium') return 'premium';
  if (me?.product) return 'free'; // 'free' and the legacy 'open' both mean no playback control
  return 'unknown';
}
