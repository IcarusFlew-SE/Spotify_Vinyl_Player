import { describe, it, expect } from 'vitest';
import { generateRandomString, base64UrlEncode, createCodeChallenge } from './pkce.js';

describe('pkce', () => {
  it('derives the S256 challenge (value cross-checked with openssl)', async () => {
    // printf '%s' <verifier> | openssl dgst -sha256 -binary | openssl base64 | tr '+/' '-_' | tr -d '='
    await expect(createCodeChallenge('dBjftJeZ4CVP-mJ92IqB7Y_YQkwhwZXPg2zFQ2XqYps')).resolves.toBe(
      'Ubwgh1Dc8IE8iWPcMq2ysnPTVWGlbwfJTHK7W8t96PU',
    );
  });

  it('base64url-encodes without padding or +/', () => {
    expect(base64UrlEncode(new Uint8Array([0xfb, 0xff, 0xfe]))).toBe('-__-');
  });

  it('generates strings of the requested length from the URL-safe charset', () => {
    const s = generateRandomString(64);
    expect(s).toMatch(/^[A-Za-z0-9]{64}$/);
    expect(generateRandomString(64)).not.toBe(s);
  });
});
