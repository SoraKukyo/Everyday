const encoder = new TextEncoder();

function base64Url(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function createMcpAccessToken() {
  if (!globalThis.crypto?.getRandomValues) throw new Error('Secure random token generation is not available in this browser.');
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return `evd_mcp_${base64Url(bytes)}`;
}

export async function sha256Hex(value) {
  if (!globalThis.crypto?.subtle) throw new Error('Secure hashing is not available in this browser. Open Everyday in a modern browser over HTTPS to create an access token.');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function tokenPrefix(token) {
  return `${token.slice(0, 15)}…`;
}

export function buildMcpConnectorUrl(endpoint, token) {
  if (!endpoint || !token) return '';
  const url = new URL(endpoint);
  url.searchParams.set('token', token);
  return url.toString();
}
