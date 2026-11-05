import { spotifyFetch } from './client.js';

export const pause = () => spotifyFetch('/me/player/pause', { method: 'PUT' });
export const next = () => spotifyFetch('/me/player/next', { method: 'POST' });
export const previous = () => spotifyFetch('/me/player/previous', { method: 'POST' });
export const seek = (ms) =>
  spotifyFetch('/me/player/seek', { method: 'PUT', query: { position_ms: Math.round(ms) } });

const isPhone = () =>
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

// Where to start music when nothing is playing: an open Spotify app is listed by Spotify but not
// "active" until something plays on it. Prefer the app on the kind of device Studify is open on
// (the phone's app when on a phone, the desktop app on a computer), then any controllable device.
export function pickDevice(devices) {
  const usable = (devices ?? []).filter((d) => d?.id && !d.is_restricted);
  const here = isPhone() ? 'smartphone' : 'computer';
  return (
    usable.find((d) => d.is_active) ?? usable.find((d) => d.type?.toLowerCase() === here) ?? usable[0] ?? null
  );
}

/**
 * Start or resume playback (`body` = what to play; none = resume). Spotify refuses "play" until a
 * device is active, which used to mean pressing play in the Spotify app first. When it refuses,
 * Studify picks the open Spotify app itself and starts the music there — the first play can come
 * from Studify.
 */
export async function startPlayback(body) {
  const request = (query) =>
    spotifyFetch('/me/player/play', {
      method: 'PUT',
      ...(body ? { body } : {}),
      ...(query ? { query } : {}),
    });
  try {
    return await request();
  } catch (err) {
    if (err.code !== 'NO_ACTIVE_DEVICE') throw err;
    const device = pickDevice((await spotifyFetch('/me/player/devices'))?.devices);
    if (!device) throw err; // no Spotify app open anywhere — the message asks the user to open one
    return request({ device_id: device.id });
  }
}

export const play = () => startPlayback();

// The song that plays next (for lyrics prefetch) — follows shuffle, unlike a track list.
// Returns null when the queue is empty or the next item is a podcast episode (no lyrics lookup).
export async function fetchNextTrack() {
  const next = (await spotifyFetch('/me/player/queue'))?.queue?.[0];
  if (!next?.artists?.length) return null;
  return {
    trackId: next.id ?? next.uri,
    title: next.name,
    artist: next.artists[0].name,
    album: next.album?.name ?? null,
    durationMs: next.duration_ms ?? 0,
  };
}
