/**
 * Generates a code verifier for PKCE.
 * @returns {string} The code verifier.
 */
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Generates a code challenge from a code verifier.
 * @param {string} codeVerifier - The code verifier.
 * @returns {Promise<string>} The code challenge.
 */
async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Base64 URL encodes a byte array.
 * @param {Uint8Array} array - The byte array to encode.
 * @returns {string} The Base64 URL encoded string.
 */
function base64UrlEncode(array) {
  let str = "";
  const bytes = new Uint8Array(array);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export { generateCodeVerifier, generateCodeChallenge };
