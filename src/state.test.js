import { describe, it, expect, vi, beforeEach } from 'vitest';

let store;

beforeEach(async () => {
  vi.resetModules(); // fresh store and listeners per test
  store = await import('./state.js');
});

describe('store', () => {
  it('calls a new subscriber immediately with its slice', () => {
    const fn = vi.fn();
    store.subscribe('timer', fn);
    expect(fn).toHaveBeenCalledWith(store.state.timer, store.state);
  });

  it('notifies only the changed slice', () => {
    const timerFn = vi.fn();
    const playbackFn = vi.fn();
    store.subscribe('timer', timerFn);
    store.subscribe('playback', playbackFn);

    store.setState('timer', { secondsLeft: 100 });
    expect(timerFn).toHaveBeenCalledTimes(2);
    expect(playbackFn).toHaveBeenCalledTimes(1); // initial paint only
  });

  it('skips notifying when nothing actually changed', () => {
    const fn = vi.fn();
    store.subscribe('timer', fn);
    store.setState('timer', { secondsLeft: store.state.timer.secondsLeft });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('stops notifying after unsubscribe', () => {
    const fn = vi.fn();
    const unsubscribe = store.subscribe('auth', fn);
    unsubscribe();
    store.setState('auth', { status: 'connected' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('re-triggers a toast for a repeated message', () => {
    const fn = vi.fn();
    store.subscribe('ui', fn);
    store.notify('hello');
    store.notify('hello');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
