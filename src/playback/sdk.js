import { getValidToken } from '../auth/auth.js';
import { spotifyFetch } from '../api/client.js';
import { pickImage } from '../api/images.js';

// "Play here": Spotify's Web Playback SDK turns this tab into a Spotify device. Premium only, and
// Spotify doesn't support it in phone browsers. While it's the active device, playback state arrives
// as events (position accurate to the millisecond) instead of polling — the tightest lyric sync.
const SDK_URL = 'https://sdk.scdn.co/spotify-player.js';
const READY_TIMEOUT_MS = 10_000;

let sdkLoading = null;
let player = null;
let deviceId = null;
let active = false;

// Phones and tablets: Spotify's in-browser player isn't supported there
export const isSdkSupported = () =>
  typeof window !== 'undefined' &&
  !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) &&
  'MediaKeys' in window; // encrypted-media support, which the SDK needs

export const isPlayingHere = () => active;

function loadSdk() {
  sdkLoading ??= new Promise((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = () => resolve(window.Spotify);
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onerror = () => {
      sdkLoading = null;
      reject(Object.assign(new Error('PLAYER_UNAVAILABLE'), { code: 'PLAYER_UNAVAILABLE' }));
    };
    document.head.append(script);
  });
  return sdkLoading;
}

// SDK state → the same playback snapshot sync.js produces
function toPlayback(s) {
  const t = s.track_window.current_track;
  return {
    status: 'ready',
    isPlaying: !s.paused,
    trackId: t.id ?? t.uri,
    trackTitle: t.name,
    trackArtist: t.artists.map((a) => a.name).join(', '),
    primaryArtist: t.artists[0]?.name ?? null,
    album: t.album?.name ?? null,
    trackUrl: t.id ? `https://open.spotify.com/track/${t.id}` : null,
    artUrl: pickImage(t.album?.images, 300),
    artThumbUrl: pickImage(t.album?.images, 64),
    progressMs: s.position,
    progressAt: Date.now(),
    durationMs: s.duration,
    contextUri: s.context?.uri ?? null,
    device: 'browser',
  };
}

const fail = (code) => Object.assign(new Error(code), { code });

/**
 * Start playing in this tab. Must be called from a click (browsers block audio otherwise).
 * onState(snapshot) — every playback change while this tab is the active device
 * onLeave()         — playback moved to another device, or the player disconnected
 */
export async function playHere({ onState, onLeave }) {
  const Spotify = await loadSdk();

  if (!player) {
    player = new Spotify.Player({
      name: 'Studify',
      getOAuthToken: (cb) => getValidToken().then(cb),
      volume: 0.8,
    });

    player.addListener('player_state_changed', (s) => {
      if (!s) {
        // Playback was transferred elsewhere (e.g. picked another device in the Spotify app)
        if (active) {
          active = false;
          onLeave();
        }
        return;
      }
      active = true;
      onState(toPlayback(s));
    });
    player.addListener('not_ready', () => {
      if (active) {
        active = false;
        onLeave();
      }
    });
  }

  await player.activateElement?.(); // unlocks audio within this user gesture

  // First time only: connect and wait for Spotify to register this tab as a device
  if (!deviceId) {
    const ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(fail('PLAYER_UNAVAILABLE')), READY_TIMEOUT_MS);
      const settle = (fn) => (arg) => {
        clearTimeout(timer);
        fn(arg);
      };
      player.addListener(
        'ready',
        settle(({ device_id }) => resolve(device_id)),
      );
      player.addListener(
        'initialization_error',
        settle(() => reject(fail('PLAYER_UNSUPPORTED'))),
      );
      player.addListener(
        'authentication_error',
        settle(() => reject(fail('UNAUTHORIZED'))),
      );
      player.addListener(
        'account_error',
        settle(() => reject(fail('PREMIUM_REQUIRED'))),
      );
    });
    if (!(await player.connect())) throw fail('PLAYER_UNAVAILABLE');
    deviceId = await ready;
  }

  // Move playback to this tab and keep it playing
  await spotifyFetch('/me/player', { method: 'PUT', body: { device_ids: [deviceId], play: true } });
}

// Controls while this tab is the device — instant, no Web API round-trip
export const here = {
  togglePlay: () => player.togglePlay(),
  next: () => player.nextTrack(),
  previous: () => player.previousTrack(),
  seek: (ms) => player.seek(Math.round(ms)),
};
