import { formatClock } from './progress.js';

const SKELETON_ROWS = 8;
const MESSAGES = {
  error: 'Couldn’t load these tracks.',
  unsupported: 'Spotify doesn’t share this list’s tracks with apps — play it from the record instead.',
  empty: 'No tracks here.',
};

/**
 * One flat track list, used by both the crate's "Tracks ›" slide-out and the Tracks tab, so they look
 * and behave the same. Keyboard: one tab stop (roving tabindex), ↑/↓ Home/End move, Enter plays.
 *
 * @param {HTMLElement} root
 * @param {{ onPlay(track, index): void, onMore(): void, idleText: string }} options
 */
export function createTrackList(root, { onPlay, onMore, idleText }) {
  const list = document.createElement('ol');
  const message = document.createElement('p');
  message.className = 'tracklist__message';
  const sentinel = document.createElement('li'); // reaching it loads the next page
  sentinel.setAttribute('aria-hidden', 'true');
  root.append(list, message);

  let rows = [];
  let items = null;
  let focusIndex = 0;

  const more = new IntersectionObserver((entries) => entries[0]?.isIntersecting && onMore(), {
    root,
    rootMargin: '200px 0px',
  });

  function row(content, index) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'track';
    btn.tabIndex = -1;
    btn.dataset.index = index;
    btn.innerHTML =
      '<span class="track__num"></span><span class="track__main"><span class="track__title"></span>' +
      '<span class="track__artist"></span></span><span class="track__time"></span>';
    if (content) {
      btn.querySelector('.track__num').textContent = String(index + 1);
      btn.querySelector('.track__title').textContent = content.title; // textContent — user data
      btn.querySelector('.track__artist').textContent = content.artist;
      btn.querySelector('.track__time').textContent = formatClock(content.durationMs);
      // aria-disabled (not disabled): unplayable rows stay focusable, so arrow keys never get stuck
      if (!content.playable) {
        btn.setAttribute('aria-disabled', 'true');
        btn.title = 'Not available to play from apps';
      }
      btn.setAttribute(
        'aria-label',
        `${content.title}, ${content.artist}, ${formatClock(content.durationMs)}`,
      );
    } else {
      btn.classList.add('is-skeleton');
      btn.disabled = true;
    }
    li.append(btn);
    return li;
  }

  function setFocusable(index) {
    rows[focusIndex]?.firstElementChild.setAttribute('tabindex', '-1');
    focusIndex = Math.max(0, Math.min(rows.length - 1, index));
    rows[focusIndex]?.firstElementChild.setAttribute('tabindex', '0');
  }

  /** @param {{ status: string, items: object[], next: string|null }} data  @param {string|null} currentId */
  function render(data, currentId) {
    more.disconnect();
    const ready = data.status === 'ready';
    message.hidden = true;

    if (data.status === 'loading') {
      items = null;
      rows = Array.from({ length: SKELETON_ROWS }, (_, i) => row(null, i));
      list.replaceChildren(...rows);
      root.setAttribute('aria-busy', 'true');
      return;
    }
    root.setAttribute('aria-busy', 'false');

    if (!ready || !data.items.length) {
      items = null;
      rows = [];
      list.replaceChildren();
      message.textContent = data.status === 'idle' ? idleText : (MESSAGES[data.status] ?? MESSAGES.empty);
      message.hidden = false;
      return;
    }

    if (data.items !== items) {
      // Appending a page keeps the rows already on screen (and their focus)
      const keep =
        items && data.items.slice(0, items.length).every((t, i) => t === items[i]) ? rows.length : 0;
      const added = data.items.slice(keep).map((t, i) => row(t, keep + i));
      rows = [...rows.slice(0, keep), ...added];
      if (keep) list.append(...added);
      else list.replaceChildren(...rows);
      items = data.items;
      setFocusable(keep ? focusIndex : 0);
    }
    if (data.next) {
      list.append(sentinel);
      more.observe(sentinel);
    }
    markCurrent(currentId);
  }

  // Highlight the playing song: an equaliser icon instead of its number
  function markCurrent(currentId) {
    rows.forEach((li, i) => {
      const btn = li.firstElementChild;
      const isCurrent = Boolean(items && currentId && items[i]?.id === currentId);
      if (btn.hasAttribute('aria-current') === isCurrent) return;
      if (isCurrent) btn.setAttribute('aria-current', 'true');
      else btn.removeAttribute('aria-current');
      btn.querySelector('.track__num').innerHTML = isCurrent
        ? '<svg aria-hidden="true"><use href="#i-bars"></use></svg>'
        : String(i + 1);
    });
  }

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('.track');
    if (!btn || btn.disabled || btn.getAttribute('aria-disabled') === 'true' || !items) return;
    const i = Number(btn.dataset.index);
    setFocusable(i);
    onPlay(items[i], i);
  });

  list.addEventListener('keydown', (e) => {
    if (!items) return;
    const moves = { ArrowDown: 1, ArrowUp: -1 };
    let target;
    if (e.key in moves) target = focusIndex + moves[e.key];
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = rows.length - 1;
    else return;
    e.preventDefault();
    setFocusable(target);
    rows[focusIndex].firstElementChild.focus();
  });

  return { render, markCurrent };
}
