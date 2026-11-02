// Colour maths for the mood engine. Colours are [r, g, b] arrays (0–255); HSL is [h 0–360, s 0–1, l 0–1].

export function rgbToHsl([r, g, b]) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

export function hslToRgb([h, s, l]) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}

export const toHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

export const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

// WCAG 2.x relative luminance and contrast ratio
export function relativeLuminance([r, g, b]) {
  const lin = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a, b) {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Lighten (keeping hue and saturation) until the colour reaches `target` contrast against a dark
// background. Luminance only grows with HSL lightness, so this always terminates — at worst at white.
export function ensureContrast(rgb, darkBg, target) {
  const [h, s, start] = rgbToHsl(rgb);
  let out = rgb;
  for (let l = start; contrastRatio(out, darkBg) < target && l < 1;) {
    l = Math.min(1, l + 0.02);
    out = hslToRgb([h, s, l]);
  }
  return out;
}
