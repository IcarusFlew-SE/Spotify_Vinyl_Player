import { state, subscribe } from '../state.js';
import { createTrackList } from './tracklist.js';
import { setArtwork } from './artwork.js';

const KIND_LABEL = { playlist: 'Playlist', album: 'Album', collection: 'Your library' };

// The Tracks tab: the playlist or album that's playing right now, with the current song marked
export function mountNowTracks({ onPlayTrack, onMore }) {
  const thumbFrame = document.getElementById('context-thumb-frame');
  const thumb = document.getElementById('context-thumb');
  const title = document.getElementById('context-title');
  const meta = document.getElementById('context-meta');
  const list = createTrackList(document.getElementById('context-list'), {
    onPlay: (track) => onPlayTrack(state.context.record, track, state.context.items),
    onMore,
    idleText: 'Play a playlist or album to see its tracks here.',
  });

  subscribe('context', (c) => {
    const r = c.record;
    title.textContent = r?.title ?? 'Nothing playing from a list';
    meta.textContent = r ? [KIND_LABEL[r.kind], r.subtitle].filter(Boolean).join(' · ') : '';
    setArtwork(thumbFrame, thumb, r?.artUrl);
    list.render(c, state.playback.trackId);
  });
  subscribe('playback', (p) => list.markCurrent(p.trackId));
}
