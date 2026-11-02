import { subscribe } from '../state.js';

const VISIBLE_MS = 4000;

// Transient status message — non-blocking replacement for alert(); fed by notify()
export function mountToast() {
  const el = document.getElementById('toast');
  let hideTimeout = null;

  subscribe('ui', ({ toast }) => {
    if (!toast) return;
    el.textContent = toast.message;
    el.dataset.tone = toast.tone; // info | success | warning | error → semantic colour
    el.classList.add('visible');
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => el.classList.remove('visible'), VISIBLE_MS);
  });
}
