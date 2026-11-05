import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let lyrics;
let stateMod;

const playing = (id, extra = {}) => ({
  status: 'ready',
  trackId: id,
  trackTitle: `Song ${id}`,
  primaryArtist: 'Artist',
  album: 'LP',
  durationMs: 100_000,
  progressMs: 0,
  progressAt: Date.now(),
  isPlaying: true,
  ...extra,
});
const found = { synced: '[00:01.00]hello', plain: 'hello', instrumental: false };

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules(); // fresh caches and store per test (IndexedDB is absent in tests → memory only)
  stateMod = await import('../../state.js');
  lyrics = await import('./index.js');
  lyrics.startLyricsSync();
});

afterEach(() => vi.useRealTimers());

const play = (p) => stateMod.setState('playback', p);

describe('lyrics sync', () => {
  it('looks up only the song the user stops on while skipping', async () => {
    const fetcher = vi.fn().mockResolvedValue(found);
    lyrics.setLyricsFetcher(fetcher);
    play(playing('a'));
    await vi.advanceTimersByTimeAsync(100);
    play(playing('b'));
    await vi.advanceTimersByTimeAsync(100);
    play(playing('c'));
    await vi.advanceTimersByTimeAsync(300);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0].title).toBe('Song c');
    expect(stateMod.state.lyrics.status).toBe('synced');
  });

  it('shares one lookup between concurrent asks for the same song', async () => {
    const fetcher = vi.fn().mockResolvedValue(found);
    lyrics.setLyricsFetcher(fetcher);
    const song = { trackId: 'x', title: 'X', artist: 'A', album: null, durationMs: 1 };
    await Promise.all([lyrics.lookup(song), lyrics.lookup(song)]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await lyrics.lookup(song); // and then from memory
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('retries once quietly after a network error, then reports it', async () => {
    const fail = Object.assign(new Error('LYRICS_UNAVAILABLE'), { code: 'LYRICS_UNAVAILABLE' });
    const fetcher = vi.fn().mockRejectedValue(fail);
    lyrics.setLyricsFetcher(fetcher);
    play(playing('a'));
    await vi.advanceTimersByTimeAsync(300);
    expect(stateMod.state.lyrics.status).toBe('loading'); // still "finding", not an error yet
    await vi.advanceTimersByTimeAsync(3300);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(stateMod.state.lyrics.status).toBe('error');
  });

  it('remembers "no lyrics" so the song is not looked up again', async () => {
    const fetcher = vi.fn().mockResolvedValue(null);
    lyrics.setLyricsFetcher(fetcher);
    play(playing('a'));
    await vi.advanceTimersByTimeAsync(300);
    play(playing('b'));
    play(playing('a'));
    expect(stateMod.state.lyrics.status).toBe('none');
    expect(fetcher.mock.calls.filter(([s]) => s.title === 'Song a')).toHaveLength(1);
  });

  it('prefetches the next song at 70%, only once the Lyrics panel has been used', async () => {
    const fetcher = vi.fn().mockResolvedValue(found);
    const next = vi
      .fn()
      .mockResolvedValue({ trackId: 'n', title: 'Next', artist: 'A', album: null, durationMs: 1 });
    lyrics.setLyricsFetcher(fetcher);
    lyrics.setNextTrackFetcher(next);

    play(playing('a'));
    await vi.advanceTimersByTimeAsync(80_000);
    expect(next).not.toHaveBeenCalled(); // panel never opened

    stateMod.setState('panel', { active: 'lyrics' });
    play(playing('b', { progressAt: Date.now() }));
    await vi.advanceTimersByTimeAsync(69_000);
    expect(next).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1500);
    expect(next).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls.at(-1)[0].title).toBe('Next');

    play(playing('n'));
    expect(stateMod.state.lyrics.status).toBe('synced'); // instant: already fetched
  });
});
