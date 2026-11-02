// Platter physics — the record spins up quickly and coasts to a stop, like a real deck
const PLAYING_SPEED = 360 / 1.8; // deg/s — same speed as the original CSS spin
const SPIN_UP_MS = 500;
const SPIN_DOWN_MS = 1600; // longer coast-down sells the weight of the platter

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Ease-out: spin-up bites immediately then settles at speed;
// spin-down brakes hard at first then lingers before the record comes to rest
const easeOut = (t) => 1 - (1 - t) ** 2;

export function createTurntable(el) {
  let angle = 0;
  let speed = 0; // current deg/s
  let targetSpeed = 0;
  let ramp = null; // { from, to, start, duration } while changing speed
  let lastTs = null;
  let rafId = null;

  function frame(ts) {
    // Clamp so a backgrounded tab doesn't jump the record when it comes back
    const dt = lastTs === null ? 0 : Math.min((ts - lastTs) / 1000, 0.1);
    lastTs = ts;

    if (ramp) {
      if (ramp.start === null) ramp.start = ts;
      const t =
        reducedMotion.matches || ramp.duration === 0 ? 1 : Math.min((ts - ramp.start) / ramp.duration, 1);
      speed = ramp.from + (ramp.to - ramp.from) * easeOut(t);
      if (t === 1) ramp = null;
    }

    angle = (angle + speed * dt) % 360;
    el.style.transform = `rotate(${angle}deg)`;

    // Stop the loop once the record has come to rest; angle is kept for the next spin-up
    if (speed === 0 && !ramp) {
      rafId = null;
      lastTs = null;
      return;
    }
    rafId = requestAnimationFrame(frame);
  }

  return {
    setPlaying(isPlaying) {
      const nextTarget = isPlaying ? PLAYING_SPEED : 0;
      if (nextTarget === targetSpeed) return;
      targetSpeed = nextTarget;

      // Start from the current speed, so a pause mid-spin-up (or vice versa) blends smoothly
      // and a partial ramp takes proportionally less time
      const fullMs = nextTarget > speed ? SPIN_UP_MS : SPIN_DOWN_MS;
      ramp = {
        from: speed,
        to: nextTarget,
        start: null,
        duration: (fullMs * Math.abs(nextTarget - speed)) / PLAYING_SPEED,
      };
      if (rafId === null) rafId = requestAnimationFrame(frame);
    },
  };
}
