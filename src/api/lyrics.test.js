import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchLyrics, cleanTitle } from './lyrics.js';

const reply = (status, data) => new Response(JSON.stringify(data), { status });
const song = {
  title: 'Dreams - 2004 Remaster',
  artist: 'Fleetwood Mac',
  album: 'Rumours',
  durationMs: 257_000,
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

describe('fetchLyrics', () => {
  it('uses the exact match when LRCLIB has one', async () => {
    fetch.mockResolvedValue(
      reply(200, { syncedLyrics: '[00:01.00]x', plainLyrics: 'x', instrumental: false }),
    );
    await expect(fetchLyrics(song)).resolves.toEqual({
      synced: '[00:01.00]x',
      plain: 'x',
      instrumental: false,
    });
    expect(fetch.mock.calls[0][0]).toContain('duration=257');
  });

  it('falls back to search, keeping only same-length songs and preferring synced lyrics', async () => {
    fetch.mockResolvedValueOnce(reply(404, {}));
    fetch.mockResolvedValueOnce(
      reply(200, [
        { duration: 300, syncedLyrics: '[00:01.00]wrong song' },
        { duration: 256.5, syncedLyrics: null, plainLyrics: 'plain' },
        { duration: 258, syncedLyrics: '[00:01.00]right', plainLyrics: 'right' },
      ]),
    );
    await expect(fetchLyrics(song)).resolves.toMatchObject({ synced: '[00:01.00]right' });
    expect(fetch.mock.calls[1][0]).toContain('track_name=Dreams&'); // cleaned title
  });

  it('returns null rather than a doubtful match', async () => {
    fetch.mockResolvedValueOnce(reply(404, {}));
    fetch.mockResolvedValueOnce(reply(200, [{ duration: 200, syncedLyrics: '[00:01.00]other' }]));
    await expect(fetchLyrics(song)).resolves.toBeNull();
  });

  it('reports network failures', async () => {
    fetch.mockRejectedValue(new TypeError('offline'));
    await expect(fetchLyrics(song)).rejects.toMatchObject({ code: 'LYRICS_UNAVAILABLE' });
  });
});

describe('cleanTitle', () => {
  it.each([
    ['Dreams - 2004 Remaster', 'Dreams'],
    ['Song (feat. Someone)', 'Song'],
    ['Track [with Other]', 'Track'],
    ['Plain', 'Plain'],
  ])('%s → %s', (input, out) => {
    expect(cleanTitle(input)).toBe(out);
  });
});
