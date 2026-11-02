// Spotify returns several sizes per image (typically 640 / 300 / 64 px, largest first).
// Pick the smallest one that is still at least `minWidth`, so we never download 640 px for a 100 px slot.
export function pickImage(images, minWidth) {
  if (!images?.length) return null;
  const sized = images.filter((img) => img.width).sort((a, b) => a.width - b.width);
  if (!sized.length) return images[0].url; // sizes unknown (e.g. some local files)
  return (sized.find((img) => img.width >= minWidth) ?? sized.at(-1)).url;
}
