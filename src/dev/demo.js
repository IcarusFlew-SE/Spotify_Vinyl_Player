// Dev-only design fixtures (DESIGN §13): render any UI state without a Spotify login.
//   ?demo=golden|neon|ocean|lofi|midnight|pop   a playing track with a generated cover
//   ?demo=boot | loading | idle | disconnected  the loading / empty states
//   &playing=0  paused      &focus=1  focus session running
//   &crate=loading | empty | error | needs-scope   crate states (default: a full crate)
//   &still=1    skip the theme colour transition (for screenshots)
//   &timer=open open the focus timer sheet
import { setState, notify, IDLE_PLAYBACK } from '../state.js';
import { startTimer } from '../features/timer/timer.js';

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

export function seekDemo(ms) {
  setState('playback', { progressMs: ms, progressAt: Date.now() });
}

export function playDemoRecord(record) {
  setState('playback', {
    status: 'ready',
    isPlaying: true,
    trackTitle: record.title,
    trackArtist: record.subtitle,
    album: record.kind === 'track' ? record.meta : record.title,
    trackUrl: 'https://open.spotify.com/',
    artUrl: record.artUrl,
    artThumbUrl: record.thumbUrl,
    progressMs: 0,
    progressAt: Date.now(),
    durationMs: 195_000,
  });
  notify(`Putting on ${record.title}`, 'success');
}

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
}
