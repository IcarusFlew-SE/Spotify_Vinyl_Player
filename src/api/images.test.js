import { describe, it, expect } from 'vitest';
import { pickImage } from './images.js';

const spotifySizes = [
  { url: 'L', width: 640 },
  { url: 'M', width: 300 },
  { url: 'S', width: 64 },
];

describe('pickImage', () => {
  it('picks the smallest image that is still big enough', () => {
    expect(pickImage(spotifySizes, 64)).toBe('S');
    expect(pickImage(spotifySizes, 200)).toBe('M');
    expect(pickImage(spotifySizes, 300)).toBe('M');
  });

  it('falls back to the largest when none is big enough', () => {
    expect(pickImage(spotifySizes, 1000)).toBe('L');
  });

  it('handles missing images and unknown sizes', () => {
    expect(pickImage([], 64)).toBeNull();
    expect(pickImage(undefined, 64)).toBeNull();
    expect(pickImage([{ url: 'X', width: null }], 64)).toBe('X');
  });
});
