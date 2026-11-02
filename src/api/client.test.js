import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../auth/auth.js', () => ({ getValidToken: vi.fn() }));

let getValidToken;
let spotifyFetch;

const json = (status, data, headers) => new Response(JSON.stringify(data), { status, headers });

beforeEach(async () => {
  vi.resetModules(); // fresh client each test — clears the rate-limit cooldown
  ({ getValidToken } = await import('../auth/auth.js'));
  ({ spotifyFetch } = await import('./client.js'));
  getValidToken.mockResolvedValue('token-a');
  globalThis.fetch = vi.fn();
});

describe('spotifyFetch', () => {
  it('returns parsed JSON and sends the bearer token', async () => {
    fetch.mockResolvedValue(json(200, { ok: 1 }));
    await expect(spotifyFetch('/me/player')).resolves.toEqual({ ok: 1 });
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer token-a');
  });

  it('returns null for 204 and empty-bodied 200', async () => {
    fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    fetch.mockResolvedValueOnce(new Response('', { status: 200 }));
    await expect(spotifyFetch('/me/player/play', { method: 'PUT' })).resolves.toBeNull();
    await expect(spotifyFetch('/me/player/play', { method: 'PUT' })).resolves.toBeNull();
  });

  it('on 401, forces one refresh and retries', async () => {
    getValidToken.mockResolvedValueOnce('token-a').mockResolvedValueOnce('token-b');
    fetch.mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(json(200, { ok: 1 }));

    await expect(spotifyFetch('/me/player')).resolves.toEqual({ ok: 1 });
    expect(getValidToken).toHaveBeenLastCalledWith({ force: true });
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer token-b');
  });

  it('gives up with UNAUTHORIZED after a second 401', async () => {
    fetch.mockResolvedValue(json(401, {}));
    await expect(spotifyFetch('/me/player')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('on 429, fails fast for the Retry-After window without calling the API', async () => {
    fetch.mockResolvedValue(json(429, {}, { 'Retry-After': '30' }));
    await expect(spotifyFetch('/me/player')).rejects.toMatchObject({ code: 'RATE_LIMITED', retryAfter: 30 });
    await expect(spotifyFetch('/me/player')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("prefers Spotify's error reason over the bare status", async () => {
    fetch.mockResolvedValueOnce(json(403, { error: { reason: 'PREMIUM_REQUIRED' } }));
    fetch.mockResolvedValueOnce(json(403, { error: { message: 'Restriction violated' } }));
    await expect(spotifyFetch('/me/player/play')).rejects.toMatchObject({ code: 'PREMIUM_REQUIRED' });
    await expect(spotifyFetch('/me/player/next')).rejects.toMatchObject({ code: 'RESTRICTED' });
  });

  it('maps a failed fetch to NETWORK_ERROR and a missing token to UNAUTHORIZED', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(spotifyFetch('/me/player')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });

    getValidToken.mockResolvedValue(null);
    await expect(spotifyFetch('/me/player')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
