import { hslToRgb, toHex, contrastRatio, ensureContrast } from './color.js';

const INK = [19, 18, 17];
const WHITE = [255, 255, 255];
const TEXT = [245, 241, 234]; // --color-text

// No artwork, or extraction failed: drop the inline variables and let tokens.css defaults apply
export const FALLBACK_THEME = Object.freeze({ vars: null });

// Palette → flat duotone theme (DESIGN §5): a background field and a darker solid card colour in the
// cover's hue, plus one accent — with contrast guaranteed against both.
export function buildTheme(palette) {
  const base = palette.dominant;
  const seed = palette.vibrant ?? palette.dominant;

  // Tinted, never black: the cover's hue at moderate saturation (an olive cover → an olive room)
  const sat = Math.min(base.s, 0.4) * 0.75;
  const bg = hslToRgb([base.h, sat, 0.15]);
  const card = hslToRgb([base.h, sat, 0.095]);

  // Greyscale covers get a warm paper accent rather than a muddy grey
  const accentSeed = seed.s < 0.15 ? hslToRgb([seed.h, 0.3, 0.72]) : seed.rgb;
  // bg is the lighter surface, so meeting the ratio on bg also meets it on the card
  const accent = ensureContrast(accentSeed, bg, 3); // controls, WCAG 1.4.11
  const accentText = ensureContrast(accent, bg, 4.8); // text: 4.5 plus margin for the oklab/sRGB gap
  const onAccent = contrastRatio(INK, accent) >= contrastRatio(WHITE, accent) ? INK : WHITE;

  return {
    vars: {
      '--color-bg': toHex(bg),
      '--color-card': toHex(card),
      '--color-accent': toHex(accent),
      '--color-accent-text': toHex(accentText),
      '--color-on-accent': toHex(onAccent),
    },
  };
}

// Spine colours for a record in the crate: the cover's dominant colour, with legible text on it
export function spineColors(palette) {
  const bg = palette.dominant.rgb;
  return { bg: toHex(bg), fg: toHex(contrastRatio(INK, bg) >= contrastRatio(TEXT, bg) ? INK : TEXT) };
}
