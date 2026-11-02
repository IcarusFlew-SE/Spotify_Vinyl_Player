// Swap an <img> inside an .art-frame, showing the frame's skeleton until the new image has decoded.
// `fallback` is shown when there's no URL or the image fails; otherwise `emptyTarget` gets [data-empty].
export function setArtwork(frame, img, url, { fallback = null, emptyTarget = frame } = {}) {
  const next = url || fallback;
  if (img.dataset.src === (next ?? '')) return;
  img.dataset.src = next ?? '';

  if (!next) {
    img.removeAttribute('src');
    frame.classList.remove('is-loading');
    emptyTarget.setAttribute('data-empty', '');
    return;
  }

  emptyTarget.removeAttribute('data-empty');
  frame.classList.add('is-loading');
  img.src = next;
  img
    .decode()
    .catch(() => {
      if (img.dataset.src !== next) return; // superseded by a newer track
      if (fallback && next !== fallback) img.src = fallback;
      else emptyTarget.setAttribute('data-empty', '');
    })
    .finally(() => {
      if (img.dataset.src === next) frame.classList.remove('is-loading');
    });
}
