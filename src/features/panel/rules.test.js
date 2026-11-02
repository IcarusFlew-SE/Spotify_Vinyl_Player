import { describe, it, expect } from 'vitest';
import { panelFor, isSettled, shouldAutoSwitch, AUTO_SWITCH_WINDOW_MS } from './rules.js';

describe('panelFor', () => {
  it.each([
    ['synced', 'lyrics'],
    ['plain', 'lyrics'],
    ['instrumental', 'tracks'],
    ['none', 'tracks'],
    ['error', 'tracks'],
  ])('%s → %s', (status, panel) => {
    expect(panelFor(status)).toBe(panel);
  });
});

describe('isSettled', () => {
  it('waits while lyrics are loading', () => {
    expect(isSettled('loading')).toBe(false);
    expect(isSettled('idle')).toBe(false);
    expect(isSettled('none')).toBe(true);
  });
});

describe('shouldAutoSwitch', () => {
  const base = { enabled: true, requestedAt: 1_000, interactedAt: 900, now: 2_000 };

  it('switches right after the user plays something', () => {
    expect(shouldAutoSwitch(base)).toBe(true);
  });

  it('never switches without a play request (e.g. a song simply ending)', () => {
    expect(shouldAutoSwitch({ ...base, requestedAt: null })).toBe(false);
  });

  it('respects the setting', () => {
    expect(shouldAutoSwitch({ ...base, enabled: false })).toBe(false);
  });

  it('leaves the panel alone if the user interacted after pressing play', () => {
    expect(shouldAutoSwitch({ ...base, interactedAt: 1_500 })).toBe(false);
  });

  it('expires stale requests', () => {
    expect(shouldAutoSwitch({ ...base, now: 1_000 + AUTO_SWITCH_WINDOW_MS + 1 })).toBe(false);
  });
});
