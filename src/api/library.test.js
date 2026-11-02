import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./client.js', () => ({ spotifyFetch: vi.fn() }));

let spotifyFetch;
let library;

beforeEach(async () => {
  vi.clearAllMocks(); // the mocked client keeps its call history across module resets
  vi.resetModules();
  ({ spotifyFetch } = await import('./client.js'));
  library = await import('./library.js');
});

const images = [
  { url: 'big', width: 640 },
  { url: 'mid', width: 300 },
  { url: 'small', width: 64 },
];

describe('fetchLibrary', () => {
  it('normalises playlists and drops null entries', async () => {
    spotifyFetch.mockResolvedValue({
      items: [
        {
          id: 'p1',
          uri: 'spotify:playlist:p1',
          name: 'Focus',
          owner: { display_name: 'me' },
          tracks: { total: 1 },
          images,
        },
        null,
      ],
    });
    const [record, ...rest] = await library.fetchLibrary('playlists');
    expect(rest).toHaveLength(0);
    expect(record).toMatchObject({
      kind: 'playlist',
      title: 'Focus',
      meta: '1 track',
      artUrl: 'mid',
      thumbUrl: 'small',
    });
    expect(spotifyFetch).toHaveBeenCalledWith('/me/playlists', { query: { limit: 50 } });
  });

  it('normalises saved albums and liked songs', async () => {
    spotifyFetch.mockResolvedValueOnce({
      items: [
        {
          album: {
            id: 'a',
            uri: 'u',
            name: 'Blue',
            artists: [{ name: 'X' }],
            release_date: '1971-06-22',
            total_tracks: 10,
            images,
          },
        },
      ],
    });
    spotifyFetch.mockResolvedValueOnce({
      items: [
        {
          track: {
            id: 't',
            uri: 'ut',
            name: 'Song',
            artists: [{ name: 'Y' }],
            album: { name: 'LP', images },
          },
        },
        { track: null }, // unavailable track
      ],
    });
    expect((await library.fetchLibrary('albums'))[0]).toMatchObject({
      kind: 'album',
      subtitle: 'X',
      meta: '1971 · 10 tracks',
    });
    const liked = await library.fetchLibrary('liked');
    expect(liked).toHaveLength(1);
    expect(liked[0]).toMatchObject({ kind: 'track', subtitle: 'Y', meta: 'LP' });
  });
});

describe('playRecord', () => {
  it('plays playlists and albums as a context', async () => {
    await library.playRecord({ kind: 'album', uri: 'spotify:album:a' }, []);
    expect(spotifyFetch).toHaveBeenCalledWith('/me/player/play', {
      method: 'PUT',
      body: { context_uri: 'spotify:album:a' },
    });
  });

  it('plays liked songs as a queue starting at the chosen track', async () => {
    const records = [
      { kind: 'track', uri: 't1' },
      { kind: 'track', uri: 't2' },
    ];
    await library.playRecord(records[1], records);
    expect(spotifyFetch.mock.lastCall[1].body).toEqual({ uris: ['t1', 't2'], offset: { position: 1 } });
  });
});
