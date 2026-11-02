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

describe('track lists', () => {
  it('lists a playlist page with only the needed fields, marking local and unavailable tracks', async () => {
    spotifyFetch.mockResolvedValue({
      items: [
        { track: { id: 'a', uri: 'ua', name: 'A', duration_ms: 1000, artists: [{ name: 'X' }] } },
        { track: { id: 'b', uri: 'ub', name: 'B', duration_ms: 1000, is_local: true, artists: [] } },
        {
          track: {
            id: 'c',
            uri: 'uc',
            name: 'C',
            duration_ms: 1000,
            is_playable: false,
            artists: [{ name: 'Y' }],
          },
        },
        { track: null },
      ],
      next: 'https://api.spotify.com/v1/playlists/p/tracks?offset=100',
    });
    const page = await library.fetchTracks({ kind: 'playlist', uri: 'spotify:playlist:p' });
    expect(page.items.map((t) => [t.title, t.playable])).toEqual([
      ['A', true],
      ['B', false],
      ['C', false],
    ]);
    expect(page.next).toContain('offset=100');
    const [path, { query }] = spotifyFetch.mock.lastCall;
    expect(path).toBe('/playlists/p/tracks');
    expect(query).toMatchObject({ limit: 100, market: 'from_token' });
    expect(query.fields).toContain('is_playable');
  });

  it('follows the next page URL as-is', async () => {
    spotifyFetch.mockResolvedValue({ items: [], next: null });
    await library.fetchTracks(
      { kind: 'album', uri: 'spotify:album:a' },
      'https://api.spotify.com/v1/next-page',
    );
    expect(spotifyFetch.mock.lastCall).toEqual([
      'https://api.spotify.com/v1/next-page',
      { query: undefined },
    ]);
  });

  it('turns a context URI into a record, or null when it cannot be listed', async () => {
    spotifyFetch.mockResolvedValue({
      id: 'p',
      uri: 'spotify:playlist:p',
      name: 'Focus',
      owner: { display_name: 'me' },
      tracks: { total: 3 },
      images,
    });
    await expect(library.fetchContextRecord('spotify:playlist:p')).resolves.toMatchObject({
      kind: 'playlist',
      title: 'Focus',
    });
    await expect(library.fetchContextRecord('spotify:user:me:collection')).resolves.toMatchObject({
      kind: 'collection',
    });
    await expect(library.fetchContextRecord('spotify:artist:x')).resolves.toBeNull();
    await expect(library.fetchContextRecord(null)).resolves.toBeNull();
  });

  it('starts a track inside its playlist or album, or queues liked songs from it', async () => {
    const track = { uri: 't2', playable: true };
    await library.playTrack({ kind: 'album', uri: 'spotify:album:a' }, track, []);
    expect(spotifyFetch.mock.lastCall[1].body).toEqual({
      context_uri: 'spotify:album:a',
      offset: { uri: 't2' },
    });

    const tracks = [{ uri: 't1', playable: true }, { uri: 'tx', playable: false }, track];
    await library.playTrack({ kind: 'collection', uri: 'spotify:collection' }, track, tracks);
    expect(spotifyFetch.mock.lastCall[1].body).toEqual({ uris: ['t1', 't2'], offset: { uri: 't2' } });
  });
});
