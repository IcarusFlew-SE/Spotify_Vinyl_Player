import { state, setState } from './state.js';

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

let intervalId = null;
let endTime = null; // absolute ms timestamp — survives tab throttling

export function toggleTimer() {
  state.timerRunning ? pauseTimer() : startTimer();
}

export function startTimer() {
  if (state.timerRunning) return;
  endTime = Date.now() + state.timerSecondsLeft * 1000;
  setState({ timerRunning: true });
  intervalId = setInterval(tick, 250); // finer poll; display still rounds to whole seconds
  tick();
}

export function pauseTimer() {
  clearInterval(intervalId);
  intervalId = null;
  // Freeze remaining time at the point of pause
  setState({ timerSecondsLeft: Math.max(0, Math.round((endTime - Date.now()) / 1000)) });
  setState({ timerRunning: false });
}

export function resetTimer() {
  clearInterval(intervalId);
  intervalId = null;
  setState({
    timerRunning: false,
    timerSecondsLeft: state.timerMode === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS,
  });
}

function tick() {
  const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
  setState({ timerSecondsLeft: remaining });

  if (remaining <= 0) {
    clearInterval(intervalId);
    intervalId = null;
    setState({ timerRunning: false });
    onSessionComplete();
    switchMode();
  }
}

function switchMode() {
  const nextMode = state.timerMode === 'focus' ? 'break' : 'focus';
  setState({
    timerMode: nextMode,
    timerSecondsLeft: nextMode === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS,
  });
}

function onSessionComplete() {
  const label = state.timerMode === 'focus' ? 'Focus session complete — take a break.' : 'Break over — back to focus.';

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Vinyl Study Player', { body: label });
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