import { spotifyFetch } from './client.js';
import { startPlayback } from './player.js';
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
    url: p.external_urls?.spotify ?? null,
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
    url: a.external_urls?.spotify ?? null,
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
    url: t.external_urls?.spotify ?? null,
    durationMs: t.duration_ms ?? 0,
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
  return startPlayback(body);
}

// ── Track lists (the crate's "Tracks ›" preview and the Tracks tab) ──

const TRACK_PAGE = { playlist: 100, album: 50 }; // each endpoint's maximum
// Only the fields a row needs — playlists can be large
const PLAYLIST_FIELDS =
  'items(track(id,uri,name,duration_ms,is_local,is_playable,type,artists(name),show(name),external_urls(spotify))),next';

// One row shape for every source. Local files and tracks unavailable in the user's country can't be
// started from an app, so they're listed but not playable.
export const toTrack = (t) => ({
  id: t.id ?? t.uri,
  uri: t.uri,
  title: t.name,
  artist: t.artists?.length ? artistNames(t.artists) : (t.show?.name ?? ''),
  durationMs: t.duration_ms ?? 0,
  playable: !t.is_local && t.is_playable !== false,
  url: t.external_urls?.spotify ?? null,
});

const idFromUri = (uri) => uri.split(':').pop();

// First page of a playlist's or album's tracks, or the page at `next` (an absolute URL from Spotify)
export async function fetchTracks(record, next = null) {
  const kind = record.kind;
  const path = next ?? `/${kind}s/${idFromUri(record.uri)}/tracks`;
  const query = next
    ? undefined
    : {
        limit: TRACK_PAGE[kind],
        market: 'from_token', // makes Spotify report is_playable for this user
        ...(kind === 'playlist' ? { fields: PLAYLIST_FIELDS } : {}),
      };
  const data = await spotifyFetch(path, { query });
  const items = (data?.items ?? []).map((i) => (kind === 'playlist' ? i?.track : i)).filter(Boolean);
  return { items: items.map(toTrack), next: data?.next ?? null };
}

// What's playing is identified only by a context URI — turn it into a record the Tracks tab can show.
// Returns null for contexts Studify can't list (artist radio, nothing, …).
export async function fetchContextRecord(contextUri) {
  const [, type, id] = contextUri?.split(':') ?? [];
  if (type === 'playlist') {
    const p = await spotifyFetch(`/playlists/${id}`, {
      query: { fields: 'id,uri,name,owner(display_name),images,external_urls,tracks(total)' },
    });
    return toRecord.playlists(p);
  }
  if (type === 'album') {
    const a = await spotifyFetch(`/albums/${id}`, { query: { market: 'from_token' } });
    return toRecord.albums({ album: a });
  }
  if (contextUri?.includes(':collection')) {
    return {
      id: 'liked',
      uri: contextUri,
      kind: 'collection',
      title: 'Liked songs',
      subtitle: 'Your library',
      meta: '',
    };
  }
  return null;
}

// Start a specific track: inside its playlist/album, so Spotify carries on from there;
// for liked songs (not a playable context) queue the listed tracks from that point.
export function playTrack(record, track, tracks) {
  const body =
    record.kind === 'playlist' || record.kind === 'album'
      ? { context_uri: record.uri, offset: { uri: track.uri } }
      : { uris: tracks.filter((t) => t.playable).map((t) => t.uri), offset: { uri: track.uri } };
  return startPlayback(body);
}
