// Dev-only design fixtures (DESIGN §13): render any UI state without a Spotify login.
//   ?demo=golden|neon|ocean|lofi|midnight|pop   a playing track with a generated cover
//   ?demo=boot | loading | idle | disconnected  the loading / empty states
//   &playing=0  paused      &focus=1  focus session running
//   &crate=loading | empty | error | needs-scope   crate states (default: a full crate)
//   &still=1    skip the theme colour transition (for screenshots)
//   &timer=open open the focus timer sheet
//   &panel=tracks | lyrics   open that side-panel tab      &drawer=1  open the crate's "Tracks ›" slide-out
//   &plan=free  a free account (follow mode)
//   &press=play click the crate's Play button after load (checks the auto-switch to lyrics)
import { state, setState, notify, IDLE_PLAYBACK } from '../state.js';
import { startTimer } from '../features/timer/timer.js';
import { loadTracks } from '../features/tracks/index.js';

const FIXTURES = {
  golden: {
    title: 'Sunday Morning Static',
    artist: 'The Paper Lanterns',
    album: 'Golden Hour Tapes',
    paint(ctx, s) {
      const g = ctx.createLinearGradient(0, 0, 0, s);
      g.addColorStop(0, '#f2a541');
      g.addColorStop(1, '#c4492d');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = '#fbe3a1';
      ctx.beginPath();
      ctx.arc(s / 2, s * 0.62, s * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a2a1c';
      ctx.fillRect(0, s * 0.72, s, s * 0.28);
    },
  },
  neon: {
    title: 'Arcade After Midnight',
    artist: 'VHS Hearts',
    album: 'Synth City',
    paint(ctx, s) {
      ctx.fillStyle = '#1a0b2e';
      ctx.fillRect(0, 0, s, s);
      ctx.lineWidth = s * 0.04;
      ['#ff2bd6', '#8a2cff', '#21e6ff'].forEach((c, i) => {
        ctx.strokeStyle = c;
        ctx.beginPath();
        ctx.arc(s / 2, s / 2, s * (0.15 + i * 0.1), 0, Math.PI * 2);
        ctx.stroke();
      });
    },
  },
  ocean: {
    title: 'Low Tide Notes',
    artist: 'Harbour Lights',
    album: 'Blue Hours',
    paint(ctx, s) {
      const g = ctx.createLinearGradient(0, 0, 0, s);
      g.addColorStop(0, '#2f80c2');
      g.addColorStop(1, '#0d3b5e');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = '#7fd3d8';
      ctx.lineWidth = s * 0.03;
      for (let y = 0.45; y < 1; y += 0.15) {
        ctx.beginPath();
        for (let x = 0; x <= s; x += 4) ctx.lineTo(x, s * y + Math.sin(x / 18) * s * 0.03);
        ctx.stroke();
      }
    },
  },
  lofi: {
    title: 'Rainy Library',
    artist: 'study tapes vol. 3',
    album: 'Pages',
    paint(ctx, s) {
      ctx.fillStyle = '#b9b2a6';
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = '#7d776e';
      ctx.fillRect(s * 0.15, s * 0.2, s * 0.7, s * 0.5);
      ctx.fillStyle = '#d8d2c6';
      ctx.fillRect(s * 0.2, s * 0.25, s * 0.6, s * 0.08);
    },
  },
  midnight: {
    title: 'Streetlight Hum',
    artist: 'Night Shift',
    album: '3 A.M.',
    paint(ctx, s) {
      ctx.fillStyle = '#07080d';
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = '#3d5a99';
      for (let i = 0; i < 40; i++) ctx.fillRect((i * 97) % s, (i * 53) % s, 2, 2);
      ctx.beginPath();
      ctx.arc(s * 0.7, s * 0.3, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  pop: {
    title: 'Bubblegum Weekend',
    artist: 'Sugar Rush',
    album: 'Pink Lemonade',
    paint(ctx, s) {
      ctx.fillStyle = '#ffd1e8';
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = '#ff4fa3';
      ctx.beginPath();
      ctx.arc(s * 0.4, s * 0.45, s * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe14d';
      ctx.beginPath();
      ctx.arc(s * 0.68, s * 0.65, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
    },
  },
};

function paintCover(fixture) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 300;
  fixture.paint(canvas.getContext('2d'), 300);
  return canvas.toDataURL('image/png');
}

// ── Crate fixtures: generated covers, so no network and no copyrighted art ──
const SHELF = [
  ['Late Night Revision', 'you', '#2d4f8c', '#f2c14e'],
  ['Brown Noise Bunker', 'you', '#6b4f3a', '#e8d5b0'],
  ['Exam Season', 'Study Club', '#c4492d', '#fbe3a1'],
  ['Lo-fi Library', 'you', '#8a9a5b', '#2b2b2b'],
  ['Coffee Shop Rain', 'Cafe Tapes', '#d9cbb3', '#5a4632'],
  ['Synth City', 'VHS Hearts', '#1a0b2e', '#ff2bd6'],
  ['Blue Hours', 'Harbour Lights', '#2f80c2', '#7fd3d8'],
  ['Pink Lemonade', 'Sugar Rush', '#ffd1e8', '#ff4fa3'],
  ['Golden Hour Tapes', 'The Paper Lanterns', '#f2a541', '#5a2a1c'],
  ['3 A.M.', 'Night Shift', '#07080d', '#3d5a99'],
  ['Greenhouse', 'Moss & Fern', '#3f6b45', '#d6e8b5'],
  ['Paper Planes', 'Origami', '#f5f1ea', '#e63946'],
  ['Deep Focus', 'you', '#14213d', '#fca311'],
  ['Pages', 'study tapes vol. 3', '#b9b2a6', '#7d776e'],
];
const KIND = { playlists: 'playlist', albums: 'album', liked: 'track' };
const coverCache = new Map();

function shelfCover(index, [, , bg, fg]) {
  const key = `${index}${bg}`;
  if (coverCache.has(key)) return coverCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 300;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 300, 300);
  ctx.fillStyle = fg;
  const shape = index % 3;
  if (shape === 0) {
    ctx.beginPath();
    ctx.arc(150, 165, 80, 0, Math.PI * 2);
    ctx.fill();
  } else if (shape === 1) {
    for (let y = 40; y < 300; y += 50) ctx.fillRect(0, y, 300, 18);
  } else {
    ctx.fillRect(60, 60, 180, 180);
  }
  const url = canvas.toDataURL('image/png');
  coverCache.set(key, url);
  return url;
}

function shelf(kind) {
  const offset = { playlists: 0, albums: 4, liked: 8 }[kind];
  return SHELF.map((_, i) => SHELF[(i + offset) % SHELF.length]).map((entry, i) => {
    const art = shelfCover((i + offset) % SHELF.length, entry);
    return {
      id: `${kind}-${i}`,
      uri: `demo:${kind}:${i}`,
      kind: KIND[kind],
      title: entry[0],
      subtitle: entry[1],
      meta: kind === 'liked' ? entry[0] : `${12 + i} tracks`,
      artUrl: art,
      thumbUrl: art,
      url: 'https://open.spotify.com/',
    };
  });
}

export function loadDemoLibrary(kind) {
  const mode = new URLSearchParams(window.location.search).get('crate');
  const status = { loading: 'loading', error: 'error', 'needs-scope': 'needs-scope' }[mode];
  if (status) return setState('library', { kind, status, items: [], selected: 0 });
  const items = mode === 'empty' ? [] : shelf(kind);
  setState('library', { kind, status: 'ready', items, selected: Math.min(3, items.length - 1) });
}

// ── Track lists and lyrics ──
const WORDS = [
  'Late',
  'Paper',
  'Quiet',
  'Neon',
  'Window',
  'Static',
  'Chalk',
  'Margins',
  'Coffee',
  'Index',
  'Rain',
  'Echo',
];
const NOUNS = [
  'Notes',
  'Hours',
  'Lights',
  'Pages',
  'Drift',
  'Loop',
  'Desk',
  'Avenue',
  'Signal',
  'Room',
  'Weather',
  'Tape',
];
const CONTEXT_URI = 'demo:playlists:0'; // what the mood fixtures are "playing from"

function demoTracks(record) {
  if (record.kind === 'track') return [];
  const seed = record.uri.length + Number(record.uri.split(':').pop());
  return Array.from({ length: 14 }, (_, i) => ({
    id: `${record.uri}:t${i}`,
    uri: `${record.uri}:t${i}`,
    title: `${WORDS[(seed + i) % WORDS.length]} ${NOUNS[(seed * 3 + i) % NOUNS.length]}`,
    artist: record.subtitle === 'you' ? 'Various Artists' : record.subtitle,
    durationMs: 150_000 + ((seed + i * 37) % 90) * 1000,
    playable: i !== 9, // one unavailable row, to show that state
    url: 'https://open.spotify.com/',
  }));
}

const allRecords = () => [...shelf('playlists'), ...shelf('albums'), ...shelf('liked')];
const recordByUri = (uri) => allRecords().find((r) => r.uri === uri) ?? null;

// Original placeholder lines (not real lyrics), timed like a song so the waterfall can be reviewed
const DEMO_LINES = [
  'Highlighter hum and a half-cold cup',
  'Margins full of the things I wrote',
  'Window rain keeps the beat for me',
  '♪',
  'One more page and then I’ll look up',
  'Chapter nine in a borrowed coat',
  'Every line is a melody',
  'Turn it over, turn it over',
  'Let the record spin a little slower',
  'All the notes I’m keeping closer',
  '♪',
  'Clock on the wall says twenty to two',
  'Flashcards fall like autumn leaves',
  'I can hear the city breathe',
  'Turn it over, turn it over',
  'Let the record spin a little slower',
  'All the notes I’m keeping closer',
  'Side A done, I’ll flip to side B',
  'Pencil down, it’s just the song and me',
];
const DEMO_LRC = DEMO_LINES.map((text, i) => {
  const t = 8 + i * 6.5;
  return `[${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(2).padStart(5, '0')}]${text === '♪' ? '' : text}`;
}).join('\n');

const freePlan = () => new URLSearchParams(window.location.search).get('plan') === 'free';

function playDemoTrack(record, track) {
  setState('playback', {
    status: 'ready',
    isPlaying: true,
    trackId: track.id,
    trackTitle: track.title,
    trackArtist: track.artist,
    primaryArtist: track.artist,
    album: record.kind === 'track' ? record.meta : record.title,
    trackUrl: 'https://open.spotify.com/',
    artUrl: record.artUrl,
    artThumbUrl: record.thumbUrl,
    contextUri: record.kind === 'track' ? null : record.uri,
    device: 'remote',
    progressMs: 0,
    progressAt: Date.now(),
    durationMs: track.durationMs,
  });
  notify(`Putting on ${track.title}`, 'success');
}

function playDemoRecord(record) {
  const track =
    record.kind === 'track'
      ? { id: record.id, title: record.title, artist: record.subtitle, durationMs: 200_000 }
      : demoTracks(record)[0];
  playDemoTrack(record, track);
}

// Drop-in replacements for app.js's services
export const services = {
  loadLibrary: loadDemoLibrary,
  playRecord: async (record) => (playDemoRecord(record), true),
  playTrack: async (record, track) => (playDemoTrack(record, track), true),
  seek: async (ms) => (setState('playback', { progressMs: ms, progressAt: Date.now() }), true),
  fetchPlan: async () => (freePlan() ? 'free' : 'premium'),
  fetchLyrics: async () => {
    await new Promise((r) => setTimeout(r, 300)); // a little latency, like the real thing
    return { synced: DEMO_LRC, plain: null, instrumental: false };
  },
  tracks: {
    tracks: async (record) => ({ items: demoTracks(record), next: null }),
    contextRecord: async (uri) => recordByUri(uri),
    liked: async () =>
      shelf('liked').map((r) => ({
        id: r.id,
        uri: r.uri,
        title: r.title,
        artist: r.subtitle,
        durationMs: 200_000,
        playable: true,
        url: r.url,
      })),
  },
};

export function runDemo(name, params) {
  if (params.get('still') === '1') document.documentElement.style.transition = 'none';
  if (params.get('focus') === '1') startTimer();

  if (name === 'boot') return; // auth stays 'unknown'
  if (name === 'disconnected') return setState('auth', { status: 'disconnected' });

  setState('auth', { status: 'connected' }); // app.js sets playback to 'loading'
  if (name === 'loading') return;
  if (name === 'idle') return setState('playback', IDLE_PLAYBACK);

  const fixture = FIXTURES[name] ?? FIXTURES.golden;
  const art = paintCover(fixture);
  setState('playback', {
    status: 'ready',
    isPlaying: params.get('playing') !== '0',
    trackId: `${CONTEXT_URI}:t2`, // the third song of the first playlist, so the Tracks tab marks it
    primaryArtist: fixture.artist,
    contextUri: CONTEXT_URI,
    trackTitle: fixture.title,
    trackArtist: fixture.artist,
    album: fixture.album,
    trackUrl: 'https://open.spotify.com/',
    artUrl: art,
    artThumbUrl: art,
    progressMs: 72_000,
    progressAt: Date.now(),
    durationMs: 214_000,
  });
  if (params.get('timer') === 'open') document.getElementById('btn-timer-open').click();
  const panel = params.get('panel');
  if (panel === 'tracks' || panel === 'lyrics') setState('panel', { active: panel });
  if (params.get('press') === 'play')
    setTimeout(() => document.getElementById('btn-crate-play').click(), 500);
  if (params.get('drawer') === '1') {
    const record = state.library.items[state.library.selected];
    if (record) {
      loadTracks('preview', record);
      setState('panel', { drawerOpen: true });
    }
  }
}
