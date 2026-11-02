import { subscribe, setState } from '../../state.js';
import { extractPalette } from './palette.js';
import { buildTheme, spineColors, FALLBACK_THEME } from './theme.js';

const SAMPLE_PX = 32; // 1,024 pixels — < 2 ms on the main thread, no worker needed
const DEBOUNCE_MS = 400; // rapid skipping shouldn't flash through every cover's colours
const CACHE_LIMIT = 300;

const palettes = new Map(); // artwork URL -> Promise<palette | null>

// Artwork URL → palette (cached). Resolves null if the image can't be read (network, tainted canvas).
export function paletteForArtwork(url) {
  if (!palettes.has(url)) {
    if (palettes.size >= CACHE_LIMIT) palettes.delete(palettes.keys().next().value); // drop the oldest
    palettes.set(url, readPalette(url));
  }
  return palettes.get(url);
}

async function readPalette(url) {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Spotify's image CDN allows this; without it the canvas is tainted
    img.src = url;
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SAMPLE_PX;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, SAMPLE_PX, SAMPLE_PX);
    return extractPalette(ctx.getImageData(0, 0, SAMPLE_PX, SAMPLE_PX).data);
  } catch {
    return null;
  }
}

export async function themeForArtwork(url) {
  const palette = await paletteForArtwork(url);
  return palette ? buildTheme(palette) : FALLBACK_THEME;
}

export async function spineColorsForArtwork(url) {
  const palette = await paletteForArtwork(url);
  return palette ? spineColors(palette) : null;
}

// Keep the theme slice in step with the current track's artwork
export function startMoodSync() {
  let currentUrl;
  let debounce = null;

  subscribe('playback', ({ artThumbUrl: url, status }) => {
    if (url === currentUrl) return;
    currentUrl = url;
    clearTimeout(debounce);

    if (!url) {
      // Keep the last colours while loading; go back to the default only when nothing is playing
      if (status === 'idle') applyTheme(FALLBACK_THEME);
      return;
    }
    // Album tracks share artwork, so most changes hit the cache; still debounce to absorb skipping
    debounce = setTimeout(async () => {
      const theme = await themeForArtwork(url);
      if (url === currentUrl) applyTheme(theme);
    }, DEBOUNCE_MS);
  });
}

function applyTheme(theme) {
  setState('theme', { vars: theme.vars, source: theme.vars ? 'artwork' : 'fallback' });
}
