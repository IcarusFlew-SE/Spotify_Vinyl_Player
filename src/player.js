import { getValidToken } from './auth.js';

const BASE = 'https://api.spotify.com/v1/me/player';

async function apiCall(path, method = 'GET', body) {
  const token = await getValidToken();
  if (!token) throw new Error('No valid Spotify token');

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // 204 = success, no content — normal for play/pause/next
  if (res.status === 204) return { ok: true };
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (res.status === 403) throw new Error('PREMIUM_REQUIRED');
  if (res.status === 404) throw new Error('NO_ACTIVE_DEVICE');
  return res.ok ? res.json() : Promise.reject(new Error(`Spotify API error: ${res.status}`));
}

export const play = () => apiCall('/play', 'PUT');
export const pause = () => apiCall('/pause', 'PUT');
export const next = () => apiCall('/next', 'POST');
export const previous = () => apiCall('/previous', 'POST');

export async function getActiveDevice() {
  const data = await apiCall('/devices');
  return data.devices.find(d => d.is_active) || data.devices[0] || null;
}