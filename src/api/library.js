import { spotifyFetch } from './client.js';
import { pickImage } from './images.js';

const PAGE = 50; // Spotify's maximum page size; the first page is plenty for a crate

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const artistNames = (artists) => artists?.map((a) => a.name).join(', ') ?? '';

// Normalise Spotify's three shapes into one record type the crate can render
const toRecord = {
  playlists: (p) => ({
    id: p.id,
    uri: p.uri,
    kind: 'playlist',
    title: p.name,
    subtitle: p.owner?.display_name ?? '',
    meta: plural(p.tracks?.total ?? 0, 'track'),
    artUrl: pickImage(p.images, 300),
    thumbUrl: pickImage(p.images, 64),
  }),
  albums: ({ album: a }) => ({
    id: a.id,
    uri: a.uri,
    kind: 'album',
    title: a.name,
    subtitle: artistNames(a.artists),
    meta: [a.release_date?.slice(0, 4), plural(a.total_tracks ?? 0, 'track')].filter(Boolean).join(' · '),
    artUrl: pickImage(a.images, 300),
    thumbUrl: pickImage(a.images, 64),
  }),
  liked: ({ track: t }) => ({
    id: t.id,
    uri: t.uri,
    kind: 'track',
    title: t.name,
    subtitle: artistNames(t.artists),
    meta: t.album?.name ?? '',
    artUrl: pickImage(t.album?.images, 300),
    thumbUrl: pickImage(t.album?.images, 64),
  }),
};

const ENDPOINTS = { playlists: '/me/playlists', albums: '/me/albums', liked: '/me/tracks' };
// Deleted or unavailable entries come back as null (or with a null album/track)
const isUsable = { playlists: (i) => i, albums: (i) => i?.album, liked: (i) => i?.track };

export async function fetchLibrary(kind) {
  const data = await spotifyFetch(ENDPOINTS[kind], { query: { limit: PAGE } });
  return (data?.items ?? []).filter(isUsable[kind]).map(toRecord[kind]);
}

// Playlists and albums play as a context (Spotify continues through them);
// liked songs aren't a context, so queue the loaded list and start at the chosen track
export function playRecord(record, records) {
  const body =
    record.kind === 'track'
      ? { uris: records.map((r) => r.uri), offset: { position: records.indexOf(record) } }
      : { context_uri: record.uri };
  return spotifyFetch('/me/player/play', { method: 'PUT', body });
}
