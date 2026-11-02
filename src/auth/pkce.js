// PKCE (RFC 7636) helpers — pure, no storage or navigation
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function generateRandomString(length) {
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + CHARSET[x % CHARSET.length], '');
}

export function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export async function createCodeChallenge(codeVerifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
  return base64UrlEncode(digest);
}
