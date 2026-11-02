import { describe, it, expect } from 'vitest';
import { parseLrc, activeLine, GAP } from './lrc.js';

describe('parseLrc', () => {
  it('parses timestamps with 2- and 3-digit fractions', () => {
    expect(parseLrc('[00:17.01]Hello\n[01:02.345]World')).toEqual([
      { time: 17_010, text: 'Hello' },
      { time: 62_345, text: 'World' },
    ]);
  });

  it('expands lines with several stamps and sorts by time', () => {
    const lines = parseLrc('[00:30.00][00:10.00]Chorus\n[00:20.00]Verse');
    expect(lines.map((l) => [l.time, l.text])).toEqual([
      [10_000, 'Chorus'],
      [20_000, 'Verse'],
      [30_000, 'Chorus'],
    ]);
  });

  it('applies the offset tag and ignores metadata', () => {
    expect(parseLrc('[ar:Someone]\n[offset:+500]\n[00:10.00]Line')).toEqual([{ time: 9_500, text: 'Line' }]);
  });

  it('marks empty timed lines as instrumental gaps', () => {
    expect(parseLrc('[00:05.00]')[0].text).toBe(GAP);
  });

  it('handles missing text', () => {
    expect(parseLrc(null)).toEqual([]);
  });
});

describe('activeLine', () => {
  const lines = parseLrc('[00:05.00]a\n[00:10.00]b\n[00:15.00]c');

  it.each([
    [0, -1],
    [5_000, 0],
    [9_999, 0],
    [10_000, 1],
    [60_000, 2],
  ])('at %i ms → line %i', (ms, index) => {
    expect(activeLine(lines, ms)).toBe(index);
  });
});
