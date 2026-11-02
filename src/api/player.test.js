import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpotifyError } from './client.js';

vi.mock('./client.js', async (importOriginal) => ({
  ...(await importOriginal()),
  spotifyFetch: vi.fn(),
}));

let spotifyFetch;
let player;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  ({ spotifyFetch } = await import('./client.js'));
  player = await import('./player.js');
});

const noDevice = () => new SpotifyError('NO_ACTIVE_DEVICE', { status: 404 });
const phone = { id: 'phone', type: 'Smartphone', is_active: false, is_restricted: false };
const laptop = { id: 'laptop', type: 'Computer', is_active: false, is_restricted: false };

describe('pickDevice', () => {
  it('prefers the active device, then one like this one, then any controllable device', () => {
    expect(player.pickDevice([phone, { ...laptop, is_active: true }]).id).toBe('laptop');
    expect(player.pickDevice([phone, laptop]).id).toBe('laptop'); // tests run as a computer
    expect(player.pickDevice([{ ...laptop, is_restricted: true }, phone]).id).toBe('phone');
    expect(player.pickDevice([])).toBeNull();
    expect(player.pickDevice(undefined)).toBeNull();
  });
});

describe('startPlayback', () => {
  it('plays normally when a device is already active', async () => {
    spotifyFetch.mockResolvedValue(null);
    await player.startPlayback({ context_uri: 'spotify:album:a' });
    expect(spotifyFetch).toHaveBeenCalledTimes(1);
    expect(spotifyFetch).toHaveBeenCalledWith('/me/player/play', {
      method: 'PUT',
      body: { context_uri: 'spotify:album:a' },
    });
  });

  it('starts on the open-but-idle Spotify app when no device is active', async () => {
    spotifyFetch
      .mockRejectedValueOnce(noDevice())
      .mockResolvedValueOnce({ devices: [phone, laptop] })
      .mockResolvedValueOnce(null);
    await player.startPlayback({ context_uri: 'spotify:album:a' });
    expect(spotifyFetch).toHaveBeenLastCalledWith('/me/player/play', {
      method: 'PUT',
      body: { context_uri: 'spotify:album:a' },
      query: { device_id: 'laptop' },
    });
  });

  it('resumes on the idle app when Play is pressed with nothing to start', async () => {
    spotifyFetch
      .mockRejectedValueOnce(noDevice())
      .mockResolvedValueOnce({ devices: [phone] })
      .mockResolvedValueOnce(null);
    await player.play();
    expect(spotifyFetch).toHaveBeenLastCalledWith('/me/player/play', {
      method: 'PUT',
      query: { device_id: 'phone' },
    });
  });

  it('still reports "no device" when no Spotify app is open anywhere', async () => {
    spotifyFetch.mockRejectedValueOnce(noDevice()).mockResolvedValueOnce({ devices: [] });
    await expect(player.startPlayback()).rejects.toMatchObject({ code: 'NO_ACTIVE_DEVICE' });
  });

  it('passes other errors straight through without looking for devices', async () => {
    spotifyFetch.mockRejectedValueOnce(new SpotifyError('PREMIUM_REQUIRED', { status: 403 }));
    await expect(player.startPlayback()).rejects.toMatchObject({ code: 'PREMIUM_REQUIRED' });
    expect(spotifyFetch).toHaveBeenCalledTimes(1);
  });
});
