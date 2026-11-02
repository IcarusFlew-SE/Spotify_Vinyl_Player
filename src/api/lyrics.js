// Lyrics from LRCLIB (lrclib.net) — free, no key, CORS-enabled. The Spotify Web API has no lyrics.
// Returns { synced, plain, instrumental } or null when no confident match exists.
const BASE = 'https://lrclib.net/api';
const DURATION_TOLERANCE_S = 2; // same song, different upload, can differ by a second or two

const toLyrics = (d) => ({
  synced: d.syncedLyrics || null,
  plain: d.plainLyrics || null,
  instrumental: Boolean(d.instrumental),
});

// "Dreams - 2004 Remaster" / "Song (feat. X)" → the bare title LRCLIB is more likely to have
export const cleanTitle = (title) =>
  title
    .replace(/\s+-\s+.*$/, '')
    .replace(/\s*[([](feat\.|ft\.|with |from ).*?[)\]]/gi, '')
    .trim();

async function getJson(url) {
  let res;
  try {
    res = await fetch(url);
  } catch {
    throw Object.assign(new Error('LYRICS_UNAVAILABLE'), { code: 'LYRICS_UNAVAILABLE' });
  }
  if (res.status === 404) return null;
  if (!res.ok) throw Object.assign(new Error('LYRICS_UNAVAILABLE'), { code: 'LYRICS_UNAVAILABLE' });
  return res.json();
}

export async function fetchLyrics({ title, artist, album, durationMs }) {
  const seconds = Math.round(durationMs / 1000);

  // 1. Exact lookup — LRCLIB matches title, artist, album and duration (±2 s) itself
  const exact = await getJson(
    `${BASE}/get?${new URLSearchParams({ track_name: title, artist_name: artist, album_name: album ?? '', duration: seconds })}`,
  );
  if (exact) return toLyrics(exact);

  // 2. Search with a cleaned title; only accept same-length songs, prefer synced lyrics, then closest length
  const results = await getJson(
    `${BASE}/search?${new URLSearchParams({ track_name: cleanTitle(title), artist_name: artist })}`,
  );
  const best = (results ?? [])
    .filter((r) => Math.abs(r.duration - durationMs / 1000) <= DURATION_TOLERANCE_S)
    .sort(
      (a, b) =>
        Boolean(b.syncedLyrics) - Boolean(a.syncedLyrics) ||
        Math.abs(a.duration - durationMs / 1000) - Math.abs(b.duration - durationMs / 1000),
    )[0];
  return best ? toLyrics(best) : null; // no confident match → show nothing rather than the wrong song
}
