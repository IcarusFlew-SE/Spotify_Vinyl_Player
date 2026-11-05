import { describe, it, expect, vi, beforeEach } from 'vitest';

// Minimal in-memory Web Storage for the Node test environment
function memoryStorage() {
  const store = new Map();
  return {
    store,
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
}

const tokenResponse = (data, status = 200) => new Response(JSON.stringify(data), { status });

let auth;
let local;
let session;

beforeEach(async () => {
  local = memoryStorage();
  session = memoryStorage();
  vi.stubGlobal('localStorage', local);
  vi.stubGlobal('sessionStorage', session);
  vi.stubGlobal('window', {
    location: { href: '', origin: 'https://studify.example' },
    isSecureContext: true,
  });
  vi.stubGlobal('fetch', vi.fn());
  vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', 'client-123');
  vi.stubEnv('VITE_SPOTIFY_REDIRECT_URI', ''); // a developer's .env may set one — test the default
  vi.resetModules(); // CLIENT_ID is read at import time
  auth = await import('./auth.js');
});

describe('redirectToSpotifyAuth', () => {
  it('sends a PKCE challenge and a state value that it remembers for the callback', async () => {
    await auth.redirectToSpotifyAuth();
    const url = new URL(window.location.href);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe(local.store.get('auth_state'));
    expect(local.store.get('code_verifier')).toHaveLength(64);
    expect(session.store.size).toBe(0); // nothing per-tab: Android may return in a different tab
  });

  it('explains instead of crashing on an insecure page (e.g. a phone on http://192.168.x.x)', async () => {
    window.isSecureContext = false;
    await expect(auth.redirectToSpotifyAuth()).rejects.toMatchObject({ code: 'AUTH_INSECURE_PAGE' });
    expect(window.location.href).toBe(''); // never left for Spotify
  });

  it('sends Spotify back to the address Studify is opened at', async () => {
    await auth.redirectToSpotifyAuth();
    expect(new URL(window.location.href).searchParams.get('redirect_uri')).toBe('https://studify.example/');
  });

  it('refuses to redirect without a client ID', async () => {
    vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', '');
    vi.resetModules();
    auth = await import('./auth.js');
    await expect(auth.redirectToSpotifyAuth()).rejects.toMatchObject({ code: 'AUTH_NOT_CONFIGURED' });
  });
});

describe('handleRedirectCallback', () => {
  beforeEach(() => {
    local.setItem('auth_state', 'state-1');
    local.setItem('code_verifier', 'verifier-1');
  });

  it('ignores URLs that are not a callback', async () => {
    await expect(auth.handleRedirectCallback('')).resolves.toBe(false);
  });

  it('exchanges the code and stores tokens when state matches', async () => {
    fetch.mockResolvedValue(tokenResponse({ access_token: 'at', expires_in: 3600, refresh_token: 'rt' }));
    await expect(auth.handleRedirectCallback('?code=c1&state=state-1')).resolves.toBe(true);
    expect(fetch.mock.calls[0][1].body.get('code_verifier')).toBe('verifier-1');
    expect(local.store.get('spotify_token')).toBe('at');
    expect(local.store.has('auth_state') || local.store.has('code_verifier')).toBe(false); // single-use values cleared
  });

  it('rejects a callback whose state does not match, without calling Spotify', async () => {
    await expect(auth.handleRedirectCallback('?code=c1&state=forged')).rejects.toMatchObject({
      code: 'AUTH_STATE_MISMATCH',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reports a declined login', async () => {
    await expect(auth.handleRedirectCallback('?error=access_denied&state=state-1')).rejects.toMatchObject({
      code: 'AUTH_DENIED',
    });
  });

  it('reports a failed token exchange', async () => {
    fetch.mockResolvedValue(tokenResponse({ error: 'invalid_grant' }, 400));
    await expect(auth.handleRedirectCallback('?code=c1&state=state-1')).rejects.toMatchObject({
      code: 'AUTH_FAILED',
    });
  });
});

describe('getValidToken', () => {
  beforeEach(() => {
    local.setItem('spotify_token', 'old');
    local.setItem('spotify_token_expires_at', '0'); // expired
    local.setItem('spotify_refresh_token', 'refresh-1');
  });

  it('shares one refresh between concurrent callers', async () => {
    fetch.mockImplementation(async () =>
      tokenResponse({ access_token: 'new', expires_in: 3600, refresh_token: 'refresh-2' }),
    );
    const tokens = await Promise.all([auth.getValidToken(), auth.getValidToken(), auth.getValidToken()]);
    expect(tokens).toEqual(['new', 'new', 'new']);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(local.store.get('spotify_refresh_token')).toBe('refresh-2');
  });

  it('refreshes a still-valid token when forced', async () => {
    local.setItem('spotify_token_expires_at', String(Date.now() + 3_600_000));
    fetch.mockResolvedValue(tokenResponse({ access_token: 'new', expires_in: 3600 }));
    await expect(auth.getValidToken()).resolves.toBe('old');
    await expect(auth.getValidToken({ force: true })).resolves.toBe('new');
  });

  it('ends the session when the refresh token is rejected', async () => {
    fetch.mockResolvedValue(tokenResponse({ error: 'invalid_grant' }, 400));
    await expect(auth.getValidToken()).resolves.toBeNull();
    expect(local.store.size).toBe(0);
  });

  it('records granted scopes, so missing ones can be detected', async () => {
    fetch.mockResolvedValue(tokenResponse({ access_token: 'new', expires_in: 3600, scope: 'a b' }));
    await auth.getValidToken();
    expect(auth.hasScopes(['a', 'b'])).toBe(true);
    expect(auth.hasScopes(['a', 'c'])).toBe(false);
  });

  it('keeps the session when Spotify itself fails', async () => {
    fetch.mockResolvedValue(tokenResponse({}, 503));
    await expect(auth.getValidToken()).rejects.toMatchObject({ code: 'AUTH_REFRESH_UNAVAILABLE' });
    expect(local.store.get('spotify_refresh_token')).toBe('refresh-1');
  });
});

describe('session and plan memory', () => {
  it('reports a session while a refresh token is stored, even if it cannot be refreshed now', () => {
    expect(auth.hasSession()).toBe(false);
    local.setItem('spotify_refresh_token', 'r');
    expect(auth.hasSession()).toBe(true);
  });

  it('remembers only a real plan, and forgets it on logout', () => {
    expect(auth.rememberedPlan()).toBe('unknown');
    auth.rememberPlan('unknown');
    expect(auth.rememberedPlan()).toBe('unknown');
    auth.rememberPlan('free');
    expect(auth.rememberedPlan()).toBe('free');
    auth.logout();
    expect(auth.rememberedPlan()).toBe('unknown');
  });

  it('a network failure during refresh throws (session kept) rather than logging out', async () => {
    local.setItem('spotify_refresh_token', 'r');
    fetch.mockRejectedValue(new TypeError('offline'));
    await expect(auth.getValidToken()).rejects.toThrow();
    expect(auth.hasSession()).toBe(true);
  });
});
