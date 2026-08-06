// Spotify API Configurations
export const CLIENT_ID = 'CLIENT_ID'; // Replace with your Dashboard Client ID
export const REDIRECT_URI = 'http://127.0.0.1:5173/';// Or your Vercel deployment URL
export const SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-modify-playback-state'
];

// ...existing exports unchanged above...

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
  // Spotify only returns a new refresh_token sometimes — don't overwrite with undefined
  if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
}

// Call this before every API request instead of reading localStorage directly
export async function getValidToken() {
  const expiresAt = Number(localStorage.getItem('spotify_token_expires_at') || 0);
  const token = localStorage.getItem('spotify_token');
  // 30s buffer so a token doesn't expire mid-request
  if (token && Date.now() < expiresAt - 30_000) return token;
  return refreshAccessToken();
}