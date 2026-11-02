// LRC lyrics: "[mm:ss.xx] words". A line may carry several stamps (repeated choruses);
// "[offset:+/-ms]" shifts every line; blank timed lines mark instrumental gaps.
const STAMP = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
const OFFSET = /^\[offset:\s*([+-]?\d+)\]/i;
export const GAP = '♪';

export function parseLrc(text) {
  if (!text) return [];
  let offset = 0;
  const lines = [];

  for (const raw of text.split(/\r?\n/)) {
    const offsetTag = raw.match(OFFSET);
    if (offsetTag) {
      offset = Number(offsetTag[1]);
      continue;
    }
    const stamps = [...raw.matchAll(STAMP)];
    if (!stamps.length) continue; // metadata ([ar:], [ti:]) and untimed text
    const words = raw.replace(STAMP, '').trim() || GAP;
    for (const [, min, sec, frac = ''] of stamps) {
      const ms = (Number(min) * 60 + Number(sec)) * 1000 + Number(frac.padEnd(3, '0'));
      lines.push({ time: ms, text: words });
    }
  }

  // A positive LRC offset means the lyrics should appear earlier
  return lines.map((l) => ({ ...l, time: Math.max(0, l.time - offset) })).sort((a, b) => a.time - b.time);
}

// Index of the line being sung at `ms` (the last line that has started), or -1 before the first
export function activeLine(lines, ms) {
  let lo = 0;
  let hi = lines.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= ms) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}
