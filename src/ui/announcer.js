// Polite screen-reader announcements (track and timer changes)
let region = null;

export function announce(text) {
  region ??= document.getElementById('announcer');
  region.textContent = '';
  // Clear then set on the next frame so repeating the same text is still announced
  requestAnimationFrame(() => {
    region.textContent = text;
  });
}
