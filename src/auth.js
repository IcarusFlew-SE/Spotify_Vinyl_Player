// Spotify API Configurations
export const CLIENT_ID = 'a9e4b2d884fe464398931658a5c60eb0'; // Replace with your Dashboard Client ID
export const REDIRECT_URI = 'http://127.0.0.1:5173/'; // Or your Vercel deployment URL
export const SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-modify-playback-state'
];

// 1. Generate Cryptographic Code Verifier & Challenge
function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64encode(input) {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// 2. Redirect User to Spotify Authorization
export async function redirectToSpotifyAuth() {
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  window.localStorage.setItem('code_verifier', codeVerifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES.join(' '),
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    redirect_uri: REDIRECT_URI,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// 3. Exchange Authorization Code for Access Token
export async function getAccessToken(code) {
  const codeVerifier = localStorage.getItem('code_verifier');
  const payload = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  };
  const response = await fetch('https://accounts.spotify.com/api/token', payload);
  const data = await response.json();
  storeTokenResponse(data);
  return data.access_token;
}

// 4. Refresh an expired token
export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('spotify_refresh_token');
  if (!refreshToken) return null;

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  const data = await response.json();
  storeTokenResponse(data);
  return data.access_token;
}

function storeTokenResponse(data) {
  if (!data.access_token) return;
  localStorage.setItem('spotify_token', data.access_token);
  localStorage.setItem('spotify_token_expires_at', String(Date.now() + data.expires_in * 1000));
  if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
}

// 5. Get a currently-valid token, refreshing if needed
export async function getValidToken() {
  const expiresAt = Number(localStorage.getItem('spotify_token_expires_at') || 0);
  const token = localStorage.getItem('spotify_token');
  if (token && Date.now() < expiresAt - 30_000) return token;
  return refreshAccessToken();
}
