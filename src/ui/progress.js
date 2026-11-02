import { subscribe } from '../state.js';

const TICK_MS = 500;
const SEEK_DEBOUNCE_MS = 250; // arrow keys on the slider shouldn't fire a request per press

export const formatClock = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

// Track position: advances locally between polls (from the last synced position + elapsed time),
// and seeks when the user drags or keys the slider.
export function mountProgress({ onSeek }) {
  const slider = document.getElementById('seek');
  const elapsed = document.getElementById('time-elapsed');
  const total = document.getElementById('time-total');
  let playback = null;
  let ticker = null;
  let dragging = false;
  let seekTimer = null;

  function paint(positionMs) {
    const duration = playback?.durationMs || 0;
    const pos = Math.min(positionMs, duration);
    slider.value = String(pos);
    slider.style.setProperty('--fill', duration ? `${(pos / duration) * 100}%` : '0%');
    slider.setAttribute('aria-valuetext', `${formatClock(pos)} of ${formatClock(duration)}`);
    elapsed.textContent = formatClock(pos);
  }

  function currentPosition() {
    if (!playback) return 0;
    const drift = playback.isPlaying ? Date.now() - playback.progressAt : 0;
    return playback.progressMs + drift;
  }

  subscribe('playback', (p) => {
    playback = p;
    const ready = p.status === 'ready' && p.durationMs > 0;
    slider.disabled = !ready;
    slider.max = String(p.durationMs || 1);
    total.textContent = formatClock(p.durationMs);
    if (!dragging) paint(currentPosition());

    // Tick only while something is actually playing
    clearInterval(ticker);
    ticker = ready && p.isPlaying ? setInterval(() => !dragging && paint(currentPosition()), TICK_MS) : null;
  });

  slider.addEventListener('input', () => {
    dragging = true;
    paint(Number(slider.value));
  });

  slider.addEventListener('change', () => {
    dragging = false;
    clearTimeout(seekTimer);
    const target = Number(slider.value);
    seekTimer = setTimeout(() => onSeek(target), SEEK_DEBOUNCE_MS);
  });
}
