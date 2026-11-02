import { subscribe } from '../state.js';
import { createTurntable } from './turntable.js';
import { setArtwork } from './artwork.js';

const BLANK_LABEL = '/blank-label.svg';

// Cover + record: the record slides out of its sleeve when a track is loaded, and spins while it plays
export function mountDeck() {
  const recordSlot = document.getElementById('record-slot');
  const labelFrame = document.getElementById('label-frame');
  const labelImg = document.getElementById('album-art');
  const sleeve = document.getElementById('sleeve');
  const sleeveFrame = document.getElementById('sleeve-frame');
  const sleeveImg = document.getElementById('sleeve-art');
  const turntable = createTurntable(document.getElementById('vinyl'));

  subscribe('playback', (p) => {
    turntable.setPlaying(p.isPlaying);
    recordSlot.classList.toggle('is-out', p.status === 'ready');

    // Label is a decorative crop; the sleeve shows the artwork unaltered (Spotify guidelines)
    setArtwork(labelFrame, labelImg, p.artUrl, { fallback: BLANK_LABEL });
    setArtwork(sleeveFrame, sleeveImg, p.artUrl, { emptyTarget: sleeve });
    sleeveImg.alt = p.album ? `Album art for ${p.album}` : '';

    // The sleeve links back to Spotify (attribution); inert when nothing is playing
    if (p.trackUrl) {
      sleeve.href = p.trackUrl;
      sleeve.setAttribute('aria-label', `Open ${p.trackTitle} in Spotify`);
    } else {
      sleeve.removeAttribute('href');
      sleeve.removeAttribute('aria-label');
    }
  });
}
