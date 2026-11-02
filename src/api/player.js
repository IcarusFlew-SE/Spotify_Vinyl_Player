import { spotifyFetch } from './client.js';

export const play = () => spotifyFetch('/me/player/play', { method: 'PUT' });
export const pause = () => spotifyFetch('/me/player/pause', { method: 'PUT' });
export const next = () => spotifyFetch('/me/player/next', { method: 'POST' });
export const previous = () => spotifyFetch('/me/player/previous', { method: 'POST' });
export const seek = (ms) =>
  spotifyFetch('/me/player/seek', { method: 'PUT', query: { position_ms: Math.round(ms) } });

export async function getActiveDevice() {
  const data = await spotifyFetch('/me/player/devices');
  return data.devices.find((d) => d.is_active) || data.devices[0] || null;
}
