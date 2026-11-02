import { state, setState, subscribe } from '../state.js';
import { panelFor, isSettled, shouldAutoSwitch } from '../features/panel/rules.js';
import { announce } from './announcer.js';

const TITLES = { records: 'Your records', tracks: 'Tracks', lyrics: 'Lyrics' };
const AUTO_FALLBACK_MS = 6000; // if the song doesn't change (e.g. replaying the same record)
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Motion: Records folds up and away; Tracks / Lyrics rise into its place. Coming back reverses it.
const OUT = {
  records: [
    { opacity: 1, transform: 'none' },
    { opacity: 0, transform: 'scaleY(0.55)' },
  ],
  other: [{ opacity: 1 }, { opacity: 0 }],
};
const IN = {
  records: [
    { opacity: 0, transform: 'scaleY(0.55)' },
    { opacity: 1, transform: 'none' },
  ],
  other: [
    { opacity: 0, transform: 'translateY(2rem)' },
    { opacity: 1, transform: 'none' },
  ],
};

/**
 * The right column's Records · Tracks · Lyrics tabs. Switches when the user picks a tab, and — only
 * right after the user plays something from the crate or a track list — once by itself to the lyrics
 * (or the track list when the song has none). It never switches on a passive song change, and not if
 * the user has touched the panel since pressing play.
 */
export function mountSidePanel() {
  const side = document.querySelector('.side');
  const title = document.getElementById('side-title');
  const tablist = side.querySelector('.column__head [role="tablist"]');
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const panels = {
    records: document.getElementById('panel-records'),
    tracks: document.getElementById('panel-tracks'),
    lyrics: document.getElementById('panel-lyrics'),
  };
  let current = state.panel.active;
  let interactedAt = 0;
  let pending = null;
  let fallback = null;

  const touched = () => {
    interactedAt = performance.now();
  };
  for (const type of ['pointerdown', 'keydown', 'wheel', 'touchstart']) {
    side.addEventListener(type, touched, { capture: true, passive: true });
  }

  function show(next) {
    tabs.forEach((tab) => {
      const on = tab.dataset.panel === next;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
    });
    title.textContent = TITLES[next];
    if (next === current) return;

    const from = panels[current];
    const to = panels[next];
    const prev = current;
    const focusWasInside = from.contains(document.activeElement);
    current = next;
    to.hidden = false;

    if (reducedMotion.matches) {
      from.hidden = true;
    } else {
      from
        .animate(prev === 'records' ? OUT.records : OUT.other, {
          duration: 220,
          easing: 'cubic-bezier(0.4, 0, 1, 1)',
        })
        .finished.then(() => {
          if (current !== prev) from.hidden = true; // unless the user switched straight back
        });
      to.animate(next === 'records' ? IN.records : IN.other, {
        duration: 360,
        delay: 140,
        easing: 'cubic-bezier(0.2, 0, 0, 1)',
        fill: 'backwards',
      });
    }

    // Focus must not vanish with the panel it was in — move it to the new panel's tab
    if (focusWasInside) tabs.find((t) => t.dataset.panel === next)?.focus({ preventScroll: true });
  }

  function decide(timedOut = false) {
    if (!pending) return;
    const l = state.lyrics;
    const songChanged = l.trackId && l.trackId !== pending.trackId;
    if (!isSettled(l.status) || (!songChanged && !timedOut)) {
      if (timedOut) pending = null;
      return;
    }
    const ok = shouldAutoSwitch({
      enabled: state.panel.autoLyrics,
      requestedAt: pending.at,
      interactedAt,
      now: performance.now(),
    });
    pending = null;
    clearTimeout(fallback);
    if (!ok) return;
    const target = panelFor(l.status);
    if (target === state.panel.active) return;
    setState('panel', { active: target, drawerOpen: false });
    announce(target === 'lyrics' ? 'Showing lyrics' : 'Showing tracks');
  }

  subscribe('panel', (p) => show(p.active));
  subscribe('lyrics', () => decide());

  for (const tab of tabs)
    tab.addEventListener('click', () => setState('panel', { active: tab.dataset.panel }));
  tablist.addEventListener('keydown', (e) => {
    const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!dir) return;
    e.preventDefault(); // keeps the global ←/→ track shortcuts from firing
    const next = tabs[(tabs.indexOf(document.activeElement) + dir + tabs.length) % tabs.length];
    next.focus();
    setState('panel', { active: next.dataset.panel });
  });

  return {
    // Call right after the user starts a record or a track
    requestAutoShow() {
      pending = { at: performance.now(), trackId: state.playback.trackId };
      clearTimeout(fallback);
      fallback = setTimeout(() => decide(true), AUTO_FALLBACK_MS);
    },
  };
}
