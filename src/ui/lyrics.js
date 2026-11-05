import { state, subscribe, setState, canControl } from '../state.js';
import { activeLine } from '../features/lyrics/lrc.js';

const LEAD_MS = 150; // show a line a beat early, the way lyric players feel "on time"
const USER_SCROLL_PAUSE_MS = 4000; // after scrolling by hand, auto-follow waits this long
const READING_LINE = 0.3; // the active line settles 30% down the panel
const STORAGE_KEY = 'studify_auto_lyrics';
const MESSAGES = {
  idle: 'Play a song to see its lyrics.',
  loading: 'Finding the lyrics…',
  instrumental: 'Instrumental — just the music on this one.',
  none: 'No lyrics for this song yet.',
  error: 'Couldn’t load the lyrics. They’ll try again next time this song plays.',
};
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/**
 * Synced lyrics "waterfall": the current line lights up and glides to a reading line while the song
 * plays; past lines dim, upcoming lines wait. Tap a line to jump there (when playback can be controlled).
 * Work happens only while the Lyrics panel is visible and music plays — one rAF loop, and the DOM
 * changes only when the active line changes.
 */
export function mountLyrics({ onSeek, onFastSync }) {
  const scroller = document.getElementById('lyrics-scroller');
  const list = document.getElementById('lyrics-lines');
  const message = document.getElementById('lyrics-message');
  const resume = document.getElementById('lyrics-resume');
  const source = document.getElementById('lyrics-source');
  const autoToggle = document.getElementById('auto-lyrics');

  let lines = []; // synced lines ({ time, text }) — empty for plain or no lyrics
  let els = [];
  let active = -2;
  let renderedFor = null;
  let frame = 0;
  let userScrollAt = 0;
  let resumeTimer = null;

  const visible = () => state.panel.active === 'lyrics' && !document.hidden;
  const userScrolling = () => Date.now() - userScrollAt < USER_SCROLL_PAUSE_MS;
  // Same estimate as the progress bar: last known position + time since, plus the small lead
  const position = (p) => p.progressMs + (p.isPlaying ? Date.now() - p.progressAt : 0) + LEAD_MS;

  function lineEl(text, index) {
    const li = document.createElement('li');
    li.className = 'lyric';
    li.dataset.index = index;
    li.textContent = text; // textContent — lyrics are third-party text
    return li;
  }

  function render(l) {
    if (l === renderedFor) return;
    renderedFor = l;
    scroller.classList.toggle('is-plain', l.status === 'plain');

    if (l.status === 'synced') {
      lines = l.lines;
      els = lines.map((line, i) => lineEl(line.text, i));
    } else if (l.status === 'plain') {
      lines = [];
      els = l.plain
        .split(/\r?\n/)
        .filter((t) => t.trim())
        .map((t, i) => lineEl(t, i));
    } else {
      lines = [];
      els = [];
    }
    list.replaceChildren(...els);

    message.hidden = !(l.status in MESSAGES);
    message.textContent = MESSAGES[l.status] ?? '';
    source.textContent =
      l.status === 'synced'
        ? 'Lyrics from LRCLIB'
        : l.status === 'plain'
          ? 'Lyrics from LRCLIB · not synced'
          : '';

    active = -2;
    userScrollAt = 0;
    resume.hidden = true;
    scroller.scrollTop = 0;
    updateSeekable();
    update(true);
    schedule();
  }

  function update(instant = false) {
    if (!lines.length) return;
    const i = activeLine(lines, position(state.playback));
    if (i === active) return;
    // Only lines between the old and new position can change class: O(lines moved), not O(all lines).
    // After a fresh render (active = -2) every line is set once.
    const lo = active === -2 ? 0 : Math.max(0, Math.min(active, i));
    const hi = active === -2 ? els.length - 1 : Math.max(active, i);
    for (let j = lo; j <= hi && j < els.length; j++) {
      els[j].classList.toggle('is-past', j < i);
      els[j].classList.toggle('is-active', j === i);
    }
    active = i;
    if (!userScrolling()) follow(instant);
  }

  function follow(instant) {
    const el = els[Math.max(active, 0)];
    if (!el || !visible()) return;
    const top = el.offsetTop - scroller.clientHeight * READING_LINE;
    scroller.scrollTo({ top, behavior: instant || reducedMotion.matches ? 'instant' : 'smooth' });
  }

  function tick() {
    frame = 0;
    update();
    schedule();
  }

  // Run the loop only while it can change something on screen
  function schedule() {
    const run = visible() && lines.length > 0 && state.playback.isPlaying;
    if (run && !frame) frame = requestAnimationFrame(tick);
    if (!run && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    onFastSync(run);
  }

  function updateSeekable() {
    scroller.classList.toggle('can-seek', lines.length > 0 && canControl());
  }

  // Scrolling by hand pauses auto-follow and offers a way back
  function onUserScroll() {
    if (!lines.length) return;
    userScrollAt = Date.now();
    resume.hidden = false;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(backToCurrent, USER_SCROLL_PAUSE_MS);
  }

  function backToCurrent() {
    clearTimeout(resumeTimer);
    userScrollAt = 0;
    resume.hidden = true;
    follow(false);
  }

  for (const type of ['wheel', 'touchmove', 'pointerdown']) {
    scroller.addEventListener(type, onUserScroll, { passive: true });
  }
  scroller.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) onUserScroll();
  });
  resume.addEventListener('click', backToCurrent);

  // Tap a line → jump the song there (Spotify behaviour)
  list.addEventListener('click', (e) => {
    const li = e.target.closest('.lyric');
    if (!li || !lines.length || !canControl()) return;
    onSeek(lines[Number(li.dataset.index)].time);
    backToCurrent();
  });

  // "Show lyrics when I play" — remembered per browser
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) setState('panel', { autoLyrics: saved === 'true' });
  } catch {
    // storage unavailable — the default (on) applies
  }
  autoToggle.addEventListener('change', () => {
    setState('panel', { autoLyrics: autoToggle.checked });
    try {
      localStorage.setItem(STORAGE_KEY, String(autoToggle.checked));
    } catch {
      // not remembered
    }
  });

  subscribe('lyrics', render);
  subscribe('playback', () => {
    update();
    schedule();
  });
  subscribe('auth', updateSeekable);
  subscribe('panel', (p) => {
    autoToggle.checked = p.autoLyrics;
    if (p.active === 'lyrics') {
      active = -2; // re-place the current line instantly when the panel opens
      update(true);
    }
    schedule();
  });
  document.addEventListener('visibilitychange', schedule);
}
