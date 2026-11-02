import { spotifyFetch } from './client.js';

// Account plan: 'premium' | 'free' | 'unknown'. Needs the user-read-private scope —
// older sessions without it get 'unknown' and are treated like Premium (errors explain the rest).
export async function fetchPlan() {
  const me = await spotifyFetch('/me');
  if (me?.product === 'premium') return 'premium';
  if (me?.product) return 'free'; // 'free' and the legacy 'open' both mean no playback control
  return 'unknown';
}
