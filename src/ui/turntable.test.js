import { describe, it, expect, vi, beforeEach } from 'vitest';

const PLAYING_SPEED = 360 / 1.8;
const FRAME_MS = 16;

let createTurntable;
let frames;
let now;
let el;

beforeEach(async () => {
  frames = [];
  now = 0;
  vi.stubGlobal('requestAnimationFrame', (fn) => frames.push(fn));
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  vi.resetModules();
  ({ createTurntable } = await import('./turntable.js'));
  el = { style: {} };
});

const angle = () => parseFloat(el.style.transform?.slice('rotate('.length) || 0);

// Advance the fake animation loop, returning the speed (deg/s) observed at each frame
function run(ms) {
  const speeds = [];
  for (let t = 0; t < ms; t += FRAME_MS) {
    const before = angle();
    now += FRAME_MS;
    const pending = frames;
    frames = [];
    pending.forEach((fn) => fn(now));
    speeds.push((((angle() - before + 360) % 360) * 1000) / FRAME_MS);
  }
  return speeds;
}

describe('turntable', () => {
  it('spins up to playing speed', () => {
    const tt = createTurntable(el);
    tt.setPlaying(true);
    const speeds = run(700);
    expect(speeds[5]).toBeLessThan(PLAYING_SPEED);
    expect(speeds.at(-1)).toBeCloseTo(PLAYING_SPEED, 0);
  });

  it('coasts down gradually and then stops the animation loop', () => {
    const tt = createTurntable(el);
    tt.setPlaying(true);
    run(700);
    tt.setPlaying(false);
    const speeds = run(2000);

    expect(speeds[10]).toBeGreaterThan(PLAYING_SPEED / 2); // still turning shortly after pause
    expect(speeds.at(-1)).toBe(0);
    expect(frames).toHaveLength(0); // loop stopped
  });

  it('keeps the angle where the record stopped', () => {
    const tt = createTurntable(el);
    tt.setPlaying(true);
    run(700);
    tt.setPlaying(false);
    run(2000);
    const stoppedAt = angle();
    tt.setPlaying(true);
    run(FRAME_MS * 2);
    expect(angle()).toBeGreaterThan(stoppedAt);
    expect(angle() - stoppedAt).toBeLessThan(5);
  });
});
