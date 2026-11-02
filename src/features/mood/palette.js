import { rgbToHsl } from './color.js';

const VIVID_S = 0.35;

// Quantise RGBA pixels into a small palette. Pixels are bucketed by hue (24 × 15°),
// lightness band (dark / mid / light) and saturation band (muted / vivid); each bucket's
// average colour becomes a swatch. Returns null when there are no opaque pixels.
export function extractPalette(pixels) {
  const buckets = new Map();
  let count = 0;
  let sumS = 0;
  let sumL = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue; // ignore transparent pixels
    const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
    const [h, s, l] = rgbToHsl(rgb);
    count++;
    sumS += s;
    sumL += l;

    const key = `${Math.floor(h / 15)}:${l < 0.3 ? 0 : l < 0.7 ? 1 : 2}:${s < VIVID_S ? 0 : 1}`;
    const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bucket.n++;
    bucket.r += rgb[0];
    bucket.g += rgb[1];
    bucket.b += rgb[2];
    buckets.set(key, bucket);
  }
  if (!count) return null;

  const swatches = [...buckets.values()]
    .map(({ n, r, g, b }) => {
      const rgb = [r / n, g / n, b / n].map(Math.round);
      const [h, s, l] = rgbToHsl(rgb);
      return { rgb, h, s, l, share: n / count };
    })
    .sort((a, b) => b.share - a.share);

  // Vibrant: favour colourful mid-tones that cover a meaningful part of the cover
  let vibrant = null;
  let best = 0;
  for (const w of swatches) {
    if (w.s < VIVID_S || w.l < 0.25 || w.l > 0.75 || w.share < 0.02) continue;
    const score = w.share * w.s * w.s;
    if (score > best) {
      best = score;
      vibrant = w;
    }
  }

  return {
    dominant: swatches[0],
    vibrant,
    muted: swatches.find((w) => w.s < VIVID_S && w.l >= 0.2 && w.l <= 0.8) ?? null,
    dark: swatches.find((w) => w.l < 0.3) ?? null,
    saturation: sumS / count, // cover-wide averages, used by the mood classifier
    lightness: sumL / count,
  };
}
