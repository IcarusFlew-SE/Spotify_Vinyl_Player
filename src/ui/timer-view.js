import { subscribe } from '../state.js';
import { formatTime } from '../features/timer/timer.js';
import { announce } from './announcer.js';

const BASE_TITLE = document.title;
const MODES = {
  focus: { label: 'Focus', icon: '#i-pencil', skip: 'Skip to break' },
  break: { label: 'Break', icon: '#i-cup', skip: 'Skip to focus' },
};

// Focus timer: a pill in the player header (shows the countdown while running) that opens a sheet
// sliding up over the player — hidden at first. The sheet holds the length sliders and the controls.
export function mountTimerView({ onToggle, onReset, onSkip, onLengths }) {
  const pill = document.getElementById('btn-timer-open');
  const pillText = document.getElementById('timer-pill-text');
  const sheet = document.getElementById('timer-sheet');
  const btnClose = document.getElementById('btn-timer-close');
  const labelText = document.getElementById('timer-label-text');
  const icon = document.getElementById('timer-icon');
  const display = document.getElementById('timer-display');
  const focusSlider = document.getElementById('focus-length');
  const breakSlider = document.getElementById('break-length');
  const focusOut = document.getElementById('focus-length-out');
  const breakOut = document.getElementById('break-length-out');
  const hint = document.getElementById('timer-hint');
  const btnToggle = document.getElementById('btn-timer-toggle');
  const btnReset = document.getElementById('btn-timer-reset');
  const btnSkip = document.getElementById('btn-timer-skip');
  let lastMode = null;

  const fill = (slider) => {
    const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.setProperty('--fill', `${pct}%`);
  };

  subscribe('timer', (t) => {
    const mode = MODES[t.mode];
    const time = formatTime(t.secondsLeft);

    // Mode is shown by label + icon + colour — never colour alone
    sheet.dataset.mode = t.mode;
    pill.dataset.mode = t.mode;
    labelText.textContent = mode.label;
    icon.setAttribute('href', mode.icon);
    display.textContent = time;
    btnToggle.textContent = t.running ? 'Pause' : 'Start';
    btnSkip.setAttribute('aria-label', mode.skip);

    // While a session runs, the pill becomes the glanceable countdown
    pillText.textContent = t.running ? `${mode.label} · ${time}` : 'Focus timer';

    focusSlider.value = String(t.focusMinutes);
    breakSlider.value = String(t.breakMinutes);
    focusOut.textContent = `${t.focusMinutes} min`;
    breakOut.textContent = `${t.breakMinutes} min`;
    fill(focusSlider);
    fill(breakSlider);
    focusSlider.disabled = t.running;
    breakSlider.disabled = t.running;
    hint.textContent = t.running ? 'Pause to change the lengths.' : '';

    // The tab title doubles as a glanceable timer while a session runs
    document.title = t.running ? `${time} · ${mode.label} — Studify` : BASE_TITLE;

    if (lastMode && t.mode !== lastMode) announce(`${mode.label} time`);
    lastMode = t.mode;
  });

  function open() {
    sheet.inert = false;
    sheet.classList.add('is-open');
    pill.setAttribute('aria-expanded', 'true');
    btnToggle.focus({ preventScroll: true });
  }

  function close() {
    sheet.classList.remove('is-open');
    sheet.inert = true; // out of the tab order and hidden from assistive tech while closed
    pill.setAttribute('aria-expanded', 'false');
    pill.focus({ preventScroll: true });
  }

  pill.addEventListener('click', () => (sheet.classList.contains('is-open') ? close() : open()));
  btnClose.addEventListener('click', close);
  sheet.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  // Sliders: live value while dragging, applied on release (or per arrow-key step)
  for (const [slider, out, key] of [
    [focusSlider, focusOut, 'focusMinutes'],
    [breakSlider, breakOut, 'breakMinutes'],
  ]) {
    slider.addEventListener('input', () => {
      out.textContent = `${slider.value} min`;
      fill(slider);
    });
    slider.addEventListener('change', () => onLengths({ [key]: Number(slider.value) }));
  }

  btnToggle.addEventListener('click', onToggle);
  btnReset.addEventListener('click', onReset);
  btnSkip.addEventListener('click', onSkip);
}
