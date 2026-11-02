import { state, setState, subscribe } from '../state.js';
import { spineColorsForArtwork } from '../features/mood/index.js';
import { setArtwork } from './artwork.js';

const SKELETON_COUNT = 9;
const KIND_LABEL = { playlist: 'Playlist', album: 'Album', track: 'Song' };
const EMPTY_TEXT = {
  playlists: 'No playlists yet — make one in Spotify and it’ll show up here.',
  albums: 'No saved albums yet.',
  liked: 'No liked songs yet.',
};
const KEY_STEPS = { ArrowDown: 1, ArrowUp: -1, PageDown: 5, PageUp: -5 };
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Record crate: library tabs, the 3D shelf of records, and the selected-record bar.
// The 3D projection is pure CSS (styles/crate.css); this module only tracks which record is centred.
export function mountCrate({ onSelectKind, onPlay, onReconnect, onRetry }) {
  const tablist = document.querySelector('.tabs');
  const tabs = [...tablist.querySelectorAll('.tab')];
  const panel = document.getElementById('crate-panel');
  const stack = document.getElementById('stack');
  const message = document.getElementById('crate-message');
  const messageText = document.getElementById('crate-message-text');
  const messageAction = document.getElementById('crate-message-action');
  const footer = document.getElementById('crate-footer');
  const thumbFrame = document.getElementById('crate-thumb-frame');
  const thumbImg = document.getElementById('crate-thumb');
  const selectedTitle = document.getElementById('crate-selected-title');
  const selectedMeta = document.getElementById('crate-selected-meta');
  const btnPlay = document.getElementById('btn-crate-play');
  const template = document.getElementById('slab-template').content.firstElementChild;

  let records = null; // the items currently rendered (null while showing skeletons or nothing)
  let slabs = []; // <li> per record
  let center = -1;
  let step = 0; // px between records — read once per layout, not per scroll frame
  let frame = 0;
  let messageHandler = null;

  // Covers and spine colours load only for records near the viewport
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        hydrate(entry.target);
      }
    },
    { root: stack, rootMargin: '100% 0px' },
  );

  function hydrate(li) {
    const record = records?.[li.dataset.index];
    if (!record) return;
    if (record.artUrl) for (const img of li.querySelectorAll('img')) img.src = record.artUrl;
    if (record.thumbUrl) {
      spineColorsForArtwork(record.thumbUrl).then((colors) => {
        if (!colors) return;
        li.style.setProperty('--spine-bg', colors.bg);
        li.style.setProperty('--spine-fg', colors.fg);
      });
    }
  }

  function createSlab(index) {
    const li = template.cloneNode(true);
    li.dataset.index = index;
    li.querySelector('.slab').dataset.index = index;
    for (const img of li.querySelectorAll('img')) img.decoding = 'async';
    return li;
  }

  function renderRecords(items, selected) {
    observer.disconnect();
    records = items;
    slabs = items.map((record, i) => {
      const li = createSlab(i);
      const by = record.subtitle ? ` by ${record.subtitle}` : '';
      li.querySelector('.slab').setAttribute(
        'aria-label',
        `${KIND_LABEL[record.kind]}: ${record.title}${by}`,
      );
      li.querySelector('.slab__title').textContent = record.title; // textContent — names are user data
      li.querySelector('.slab__sub').textContent = record.subtitle;
      return li;
    });
    stack.replaceChildren(...slabs);
    slabs.forEach((li) => observer.observe(li));
    measure();
    center = -1;
    setCenter(selected);
    stack.scrollTop = center * step;
  }

  function renderSkeleton() {
    observer.disconnect();
    records = null;
    slabs = [];
    center = -1;
    const placeholders = Array.from({ length: SKELETON_COUNT }, (_, i) => {
      const li = createSlab(i);
      li.classList.add('is-skeleton');
      li.querySelector('.slab').tabIndex = -1;
      return li;
    });
    stack.replaceChildren(...placeholders);
    measure();
    stack.scrollTop = step * Math.floor(SKELETON_COUNT / 2);
  }

  function clearStack() {
    observer.disconnect();
    records = null;
    slabs = [];
    center = -1;
    stack.replaceChildren();
  }

  function measure() {
    step = stack.firstElementChild?.offsetHeight ?? 0;
  }

  function setCenter(index) {
    if (!records?.length) return;
    const i = Math.max(0, Math.min(records.length - 1, index));
    if (i === center) return;
    center = i;
    slabs.forEach((li, j) => {
      li.classList.toggle('is-centered', j === i);
      // Records nearer the centre paint on top, so spines overlap covers the way real records would
      li.style.zIndex = String(records.length - Math.abs(j - i));
      // Roving tabindex: Tab lands on the centred record; arrow keys move between records
      li.firstElementChild.tabIndex = j === i ? 0 : -1;
    });
    setState('library', { selected: i });
  }

  function scrollToIndex(index, { focus = false } = {}) {
    if (!records?.length) return;
    const i = Math.max(0, Math.min(records.length - 1, index));
    stack.scrollTo({ top: i * step, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    setCenter(i);
    if (focus) slabs[i].firstElementChild.focus({ preventScroll: true });
  }

  function playSelected() {
    const { items, selected } = state.library;
    const record = items[selected];
    if (!record) return;
    // A small lift on the chosen record — the only JS animation, and skipped for reduced motion
    if (!reducedMotion.matches) {
      slabs[selected]?.firstElementChild.animate(
        [{ transform: 'translateY(0)' }, { transform: 'translateY(-12px)' }, { transform: 'translateY(0)' }],
        { duration: 380, easing: 'cubic-bezier(0.3, 0, 0, 1.3)' },
      );
    }
    onPlay(record, items);
  }

  function showMessage(text, action = null) {
    message.hidden = !text;
    messageText.textContent = text ?? '';
    messageAction.hidden = !action;
    messageAction.textContent = action?.label ?? '';
    messageHandler = action?.run ?? null;
  }

  function renderFooter(lib, connected) {
    const record = lib.status === 'ready' ? lib.items[lib.selected] : null;
    footer.hidden = !record; // nothing selected → no bar, rather than an empty one
    selectedTitle.textContent = record?.title ?? '';
    selectedMeta.textContent = record
      ? [KIND_LABEL[record.kind], record.subtitle, record.meta].filter(Boolean).join(' · ')
      : '';
    setArtwork(thumbFrame, thumbImg, record?.artUrl);
    btnPlay.disabled = !record || !connected;
    btnPlay.setAttribute('aria-label', record ? `Play ${record.title}` : 'Play');
  }

  subscribe('library', (lib, s) => {
    for (const tab of tabs) {
      const active = tab.dataset.kind === lib.kind;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active) panel.setAttribute('aria-labelledby', tab.id);
    }

    stack.setAttribute('aria-busy', String(lib.status === 'loading'));
    if (lib.status === 'loading') {
      if (records !== null || !stack.firstElementChild) renderSkeleton();
    } else if (lib.status === 'ready' && lib.items.length) {
      if (lib.items !== records) renderRecords(lib.items, lib.selected);
    } else {
      clearStack();
    }

    if (lib.status === 'idle')
      showMessage('Connect Spotify to browse your playlists, albums and liked songs.');
    else if (lib.status === 'needs-scope') {
      showMessage('Studify needs permission to read your library.', {
        label: 'Reconnect Spotify',
        run: onReconnect,
      });
    } else if (lib.status === 'error') {
      showMessage('Couldn’t load your records.', { label: 'Try again', run: () => onRetry(lib.kind) });
    } else if (lib.status === 'ready' && !lib.items.length) showMessage(EMPTY_TEXT[lib.kind]);
    else showMessage(null);

    renderFooter(lib, s.auth.status === 'connected');
  });
  subscribe('auth', (auth, s) => renderFooter(s.library, auth.status === 'connected'));

  // Scrolling: work out the centred record at most once per frame (one scrollTop read, no layout)
  stack.addEventListener(
    'scroll',
    () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (step) setCenter(Math.round(stack.scrollTop / step));
      });
    },
    { passive: true },
  );

  // Tap a record to bring it to the centre; tap the centred record to play it
  stack.addEventListener('click', (e) => {
    const slab = e.target.closest('.slab');
    if (!slab || !records) return;
    const i = Number(slab.dataset.index);
    if (i === center) playSelected();
    else scrollToIndex(i);
  });

  stack.addEventListener('keydown', (e) => {
    if (!records?.length) return;
    let target;
    if (e.key in KEY_STEPS) target = center + KEY_STEPS[e.key];
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = records.length - 1;
    else return;
    e.preventDefault();
    scrollToIndex(target, { focus: true });
  });

  // Tabs: click, or ←/→ with automatic activation (WAI-ARIA tabs pattern)
  for (const tab of tabs) tab.addEventListener('click', () => onSelectKind(tab.dataset.kind));
  tablist.addEventListener('keydown', (e) => {
    const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!dir) return;
    e.preventDefault(); // also keeps the global ←/→ track shortcuts from firing
    const next = tabs[(tabs.indexOf(document.activeElement) + dir + tabs.length) % tabs.length];
    next.focus();
    onSelectKind(next.dataset.kind);
  });

  messageAction.addEventListener('click', () => messageHandler?.());
  btnPlay.addEventListener('click', playSelected);

  // Keep the centred record centred when the crate resizes (rotation, window resize)
  new ResizeObserver(() => {
    measure();
    if (records && center >= 0) stack.scrollTop = center * step;
  }).observe(stack);
}
