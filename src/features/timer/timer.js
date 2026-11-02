import { state, setState } from '../../state.js';

const STORAGE_KEY = 'studify_timer_lengths';
export const LIMITS = { focus: [5, 90], break: [1, 30] }; // minutes — match the sliders in index.html

let intervalId = null;
let endTime = null; // absolute ms timestamp — survives tab throttling

const durationFor = (mode) => (mode === 'focus' ? state.timer.focusMinutes : state.timer.breakMinutes) * 60;
const secondsUntil = (ts) => Math.max(0, Math.round((ts - Date.now()) / 1000));
const clamp = (n, [min, max]) => Math.min(max, Math.max(min, Math.round(n)));

// Restore the user's chosen lengths (storage can be unavailable — then the defaults stand)
export function initTimer() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    // private mode / blocked storage
  }
  if (saved) setLengths(saved, { persist: false });
}

// Change the focus/break lengths from the sliders. Only while stopped: the current phase restarts
// at its new length, so the display always matches what the slider says.
export function setLengths(
  { focusMinutes = state.timer.focusMinutes, breakMinutes = state.timer.breakMinutes },
  { persist = true } = {},
) {
  if (state.timer.running) return;
  setState('timer', {
    focusMinutes: clamp(focusMinutes, LIMITS.focus),
    breakMinutes: clamp(breakMinutes, LIMITS.break),
  });
  setState('timer', { secondsLeft: durationFor(state.timer.mode) });
  if (persist) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ focusMinutes: state.timer.focusMinutes, breakMinutes: state.timer.breakMinutes }),
      );
    } catch {
      // not remembered — still applies for this visit
    }
  }
}

export function toggleTimer() {
  state.timer.running ? pauseTimer() : startTimer();
}

export function startTimer() {
  if (state.timer.running) return;
  endTime = Date.now() + state.timer.secondsLeft * 1000;
  setState('timer', { running: true });
  intervalId = setInterval(tick, 250); // finer poll; the store only re-renders when the second changes
  tick();
}

export function pauseTimer() {
  if (!state.timer.running) return;
  clearInterval(intervalId);
  intervalId = null;
  // Freeze remaining time at the point of pause
  setState('timer', { running: false, secondsLeft: secondsUntil(endTime) });
}

export function resetTimer() {
  clearInterval(intervalId);
  intervalId = null;
  setState('timer', { running: false, secondsLeft: durationFor(state.timer.mode) });
}

// Jump straight to the next phase (focus → break, break → focus), stopped
export function skipPhase() {
  clearInterval(intervalId);
  intervalId = null;
  setState('timer', { running: false });
  switchMode();
}

function tick() {
  const remaining = secondsUntil(endTime);
  setState('timer', { secondsLeft: remaining });

  if (remaining <= 0) {
    clearInterval(intervalId);
    intervalId = null;
    setState('timer', { running: false });
    onSessionComplete();
    switchMode();
  }
}

function switchMode() {
  const nextMode = state.timer.mode === 'focus' ? 'break' : 'focus';
  setState('timer', { mode: nextMode, secondsLeft: durationFor(nextMode) });
}

function onSessionComplete() {
  const label =
    state.timer.mode === 'focus' ? 'Focus session complete — take a break.' : 'Break over — back to focus.';

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Studify', { body: label });
  } else {
    // Fallback: works even if tab is backgrounded/unfocused, unlike a silent DOM toast
    alert(label);
  }
}

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function formatTime(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}
