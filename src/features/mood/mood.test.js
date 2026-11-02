import { describe, it, expect } from 'vitest';
import { extractPalette } from './palette.js';
import { buildTheme, spineColors } from './theme.js';
import { contrastRatio, ensureContrast, rgbToHsl, hslToRgb } from './color.js';

// Build RGBA pixel data from [colour, share] pairs (1,000 pixels total)
function cover(...parts) {
  const px = [];
  for (const [[r, g, b], share] of parts) {
    for (let i = 0; i < Math.round(share * 1000); i++) px.push(r, g, b, 255);
  }
  return new Uint8ClampedArray(px);
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

describe('color', () => {
  it('computes WCAG contrast', () => {
    expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 1);
    expect(contrastRatio([0, 0, 0], [0, 0, 0])).toBe(1);
  });

  it('round-trips HSL', () => {
    expect(hslToRgb(rgbToHsl([200, 100, 50]))).toEqual([200, 100, 50]);
  });

  it('lightens until the target contrast is met', () => {
    const darkBg = [20, 15, 12];
    const blue = ensureContrast([0, 0, 255], darkBg, 4.5); // pure blue is ~2.3:1 on near-black
    expect(contrastRatio(blue, darkBg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('extractPalette', () => {
  it('finds the dominant and vibrant colours', () => {
    const p = extractPalette(cover([[240, 140, 40], 0.6], [[30, 20, 15], 0.4]));
    expect(p.dominant.rgb).toEqual([240, 140, 40]);
    expect(p.vibrant.rgb).toEqual([240, 140, 40]);
    expect(p.dark.rgb).toEqual([30, 20, 15]);
  });

  it('reports no vibrant colour for greyscale covers', () => {
    expect(extractPalette(cover([[128, 128, 128], 0.7], [[220, 220, 220], 0.3])).vibrant).toBeNull();
  });

  it('ignores transparent pixels and returns null when nothing is opaque', () => {
    expect(extractPalette(new Uint8ClampedArray([255, 0, 0, 0]))).toBeNull();
  });
});

describe('buildTheme contrast guarantees', () => {
  const TEXT = [245, 241, 234];
  const muted = (card) => TEXT.map((v, i) => Math.round(v * 0.68 + card[i] * 0.32)); // --color-text-muted

  // Pathological covers: all white, all black, pure blue, pure yellow, mid grey, olive
  it.each([
    ['white', [255, 255, 255]],
    ['black', [0, 0, 0]],
    ['pure blue', [0, 0, 255]],
    ['pure yellow', [255, 255, 0]],
    ['mid grey', [128, 128, 128]],
    ['olive', [96, 110, 70]],
  ])('%s cover stays readable', (_, colour) => {
    const { vars } = buildTheme(extractPalette(cover([colour, 1])));
    const bg = hex(vars['--color-bg']);
    const card = hex(vars['--color-card']);
    const accent = hex(vars['--color-accent']);

    for (const surface of [bg, card]) {
      expect(contrastRatio(TEXT, surface)).toBeGreaterThanOrEqual(7); // body text — WCAG AAA
      expect(contrastRatio(muted(card), surface)).toBeGreaterThanOrEqual(4.5); // secondary text
      expect(contrastRatio(hex(vars['--color-accent-text']), surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(accent, surface)).toBeGreaterThanOrEqual(3); // controls
    }
    expect(contrastRatio(hex(vars['--color-on-accent']), accent)).toBeGreaterThanOrEqual(4.5);
  });

  it('tints the background with the cover hue (flat duotone, not black)', () => {
    const { vars } = buildTheme(extractPalette(cover([[96, 110, 70], 1])));
    const [, g, b] = hex(vars['--color-bg']);
    expect(g).toBeGreaterThan(b); // olive cover → olive room
    expect(contrastRatio(hex(vars['--color-bg']), hex(vars['--color-card']))).toBeGreaterThan(1.1); // card reads as a separate surface
  });
});

describe('spineColors', () => {
  it.each([
    ['white', [250, 250, 250]],
    ['black', [10, 10, 10]],
    ['orange', [230, 120, 40]],
    ['blue', [40, 70, 160]],
  ])('%s spine keeps its label legible', (_, colour) => {
    const { bg, fg } = spineColors(extractPalette(cover([colour, 1])));
    expect(contrastRatio(hex(fg), hex(bg))).toBeGreaterThanOrEqual(4.5);
  });
});
