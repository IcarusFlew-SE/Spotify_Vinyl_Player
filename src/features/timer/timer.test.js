import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let timer;
let store;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.stubGlobal('window', {}); // no Notification support → falls back to alert
  vi.stubGlobal('alert', vi.fn());
  vi.resetModules();
  store = await import('../../state.js');
  timer = await import('./timer.js');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('timer', () => {
  it('formats minutes and seconds', () => {
    expect(timer.formatTime(25 * 60)).toBe('25:00');
    expect(timer.formatTime(65)).toBe('01:05');
    expect(timer.formatTime(0)).toBe('00:00');
  });

  it('counts down and freezes the remaining time on pause', () => {
    timer.startTimer();
    vi.advanceTimersByTime(10_000);
    timer.pauseTimer();
    expect(store.state.timer).toMatchObject({ running: false, secondsLeft: 25 * 60 - 10 });

    vi.advanceTimersByTime(60_000);
    expect(store.state.timer.secondsLeft).toBe(25 * 60 - 10);
  });

  it('switches to a break when the focus session ends', () => {
    timer.startTimer();
    vi.advanceTimersByTime(25 * 60 * 1000);
    expect(store.state.timer).toMatchObject({ mode: 'break', secondsLeft: 5 * 60, running: false });
    expect(alert).toHaveBeenCalledWith('Focus session complete — take a break.');
  });

  it('skips to the next phase, stopped', () => {
    timer.startTimer();
    timer.skipPhase();
    expect(store.state.timer).toMatchObject({ mode: 'break', secondsLeft: 5 * 60, running: false });
    timer.skipPhase();
    expect(store.state.timer.mode).toBe('focus');
  });

  it('applies new lengths from the sliders, clamped, and remembers them', () => {
    const saved = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => saved.get(k) ?? null,
      setItem: (k, v) => saved.set(k, v),
    });

    timer.setLengths({ focusMinutes: 50, breakMinutes: 99 });
    expect(store.state.timer).toMatchObject({ focusMinutes: 50, breakMinutes: 30, secondsLeft: 50 * 60 });
    expect(JSON.parse(saved.get('studify_timer_lengths'))).toEqual({ focusMinutes: 50, breakMinutes: 30 });
  });

  it('ignores length changes while a session is running', () => {
    timer.startTimer();
    timer.setLengths({ focusMinutes: 50 });
    expect(store.state.timer.focusMinutes).toBe(25);
  });

  it('restores saved lengths, and survives unavailable storage', () => {
    vi.stubGlobal('localStorage', { getItem: () => '{"focusMinutes":45,"breakMinutes":10}' });
    timer.initTimer();
    expect(store.state.timer).toMatchObject({ focusMinutes: 45, breakMinutes: 10, secondsLeft: 45 * 60 });

    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
    });
    expect(() => timer.initTimer()).not.toThrow();
  });

  it('re-renders once per second, not on every 250 ms tick', () => {
    const fn = vi.fn();
    store.subscribe('timer', fn);
    timer.startTimer(); // +1 render (running: true)
    fn.mockClear();
    vi.advanceTimersByTime(3_000);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
