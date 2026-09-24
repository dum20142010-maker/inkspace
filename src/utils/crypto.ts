/**
 * Cryptographic utility functions for secure client-side password hashing
 * and verification using native Web Crypto API (SHA-256 with cryptographically strong salt).
 */

export function generateSalt(length = 16): string {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashStringWithSalt(input: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  // Standard HMAC-like preimage construction for client storage
  const data = encoder.encode(`${salt}:${input.trim()}:${salt}`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const computed = await hashStringWithSalt(password, salt);
  return computed === expectedHash;
}

export async function verifySecurityAnswer(answer: string, salt: string, expectedHash: string): Promise<boolean> {
  // Normalize answer (case-insensitive and trimmed)
  const normalized = answer.trim().toLowerCase();
  const computed = await hashStringWithSalt(normalized, salt);
  return computed === expectedHash;
}
