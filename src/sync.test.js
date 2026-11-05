import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { nextDelay, DELAYS } from './sync.js';

vi.mock('./api/client.js', () => ({ spotifyFetch: vi.fn() }));

describe('nextDelay', () => {
  it('picks the delay for each situation', () => {
    expect(nextDelay({ playing: true })).toBe(DELAYS.playing);
    expect(nextDelay({ playing: true, fast: true })).toBe(DELAYS.fast);
    expect(nextDelay({ playing: false })).toBe(DELAYS.paused);
    expect(nextDelay({ playing: true, fast: true, hidden: true })).toBe(DELAYS.hidden);
  });

  it('polls just after the song should end', () => {
    expect(nextDelay({ playing: true, msToEnd: 500 })).toBe(500 + DELAYS.endSlack);
    expect(nextDelay({ playing: true, msToEnd: 60_000 })).toBe(DELAYS.playing);
    expect(nextDelay({ playing: true, msToEnd: -10 })).toBe(DELAYS.playing); // overdue: no spinning
    expect(nextDelay({ playing: false, msToEnd: 500 })).toBe(DELAYS.paused);
  });

  it('backs off after repeated failures, capped, with jitter', () => {
    const mid = () => 0.5; // no jitter
    expect(nextDelay({ playing: true, failures: 2 }, mid)).toBe(DELAYS.playing);
    expect(nextDelay({ failures: 3 }, mid)).toBe(4000);
    expect(nextDelay({ failures: 4 }, mid)).toBe(8000);
    expect(nextDelay({ failures: 20 }, mid)).toBe(DELAYS.backoffMax);
    expect(nextDelay({ failures: 3 }, () => 0)).toBe(3200);
    expect(nextDelay({ failures: 3 }, () => 1)).toBe(4800);
  });

  it('waits out a rate-limit cooldown', () => {
    expect(nextDelay({ playing: true, retryAfterMs: 7000 })).toBe(7000);
  });
});

describe('poll loop', () => {
  let sync;
  let spotifyFetch;
  let state;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    vi.stubGlobal('window', { addEventListener: vi.fn() });
    ({ spotifyFetch } = await import('./api/client.js'));
    spotifyFetch.mockReset();
    sync = await import('./sync.js');
    ({ state } = await import('./state.js'));
  });

  afterEach(() => {
    sync.stopSync();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const song = (progress, duration = 200_000, playing = true) => ({
    is_playing: playing,
    progress_ms: progress,
    item: {
      id: 't',
      name: 'T',
      duration_ms: duration,
      artists: [{ name: 'A' }],
      album: { name: 'L', images: [] },
    },
  });

  it('slows down when paused and polls right after the song should end', async () => {
    spotifyFetch.mockResolvedValue(song(0, 200_000, false));
    sync.startSync();
    await vi.advanceTimersByTimeAsync(0);
    expect(spotifyFetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(DELAYS.playing);
    expect(spotifyFetch).toHaveBeenCalledTimes(1); // paused: not yet
    spotifyFetch.mockResolvedValue(song(199_000));
    await vi.advanceTimersByTimeAsync(DELAYS.paused - DELAYS.playing);
    expect(spotifyFetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1000 + DELAYS.endSlack);
    expect(spotifyFetch).toHaveBeenCalledTimes(3); // end-of-song poll, before the 2 s tick
  });

  it('marks the connection offline after repeated network errors and recovers on success', async () => {
    spotifyFetch.mockRejectedValue(Object.assign(new Error('NETWORK_ERROR'), { code: 'NETWORK_ERROR' }));
    sync.startSync();
    await vi.advanceTimersByTimeAsync(0);
    expect(state.net.online).toBe(true); // one blip isn't offline
    await vi.advanceTimersByTimeAsync(DELAYS.paused);
    expect(state.net.online).toBe(false);
    spotifyFetch.mockResolvedValue(song(0));
    sync.syncNow();
    await vi.advanceTimersByTimeAsync(0);
    expect(state.net.online).toBe(true);
    expect(state.playback.status).toBe('ready');
  });

  it('never sends two polls at once', async () => {
    let release;
    spotifyFetch.mockImplementation(() => new Promise((r) => (release = r)));
    sync.startSync();
    sync.syncNow();
    sync.syncNow();
    expect(spotifyFetch).toHaveBeenCalledTimes(1);
    release(song(0));
    await vi.advanceTimersByTimeAsync(0);
    expect(spotifyFetch).toHaveBeenCalledTimes(2); // the queued re-poll, once
  });
});
