/**
 * Crypto module: PBKDF2 key derivation + AES-GCM encryption/decryption
 * for secure profile storage.
 */

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const PREFIX = 'openclaw-voice:';

export interface EncryptedBlob {
  salt: string;   // base64
  iv: string;     // base64
  data: string;   // base64
  version: number;
}

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(s: string): ArrayBuffer {
  const bin = atob(s);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr.buffer;
}

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(plaintext: string, password: string): Promise<EncryptedBlob> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );
  return {
    salt: toBase64(salt.buffer),
    iv: toBase64(iv.buffer),
    data: toBase64(ciphertext),
    version: 1,
  };
}

export async function decrypt(blob: EncryptedBlob, password: string): Promise<string> {
  const salt = new Uint8Array(fromBase64(blob.salt));
  const iv = new Uint8Array(fromBase64(blob.iv));
  const data = fromBase64(blob.data);
  const key = await deriveKey(password, salt);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  return new TextDecoder().decode(plaintext);
}

// --- Vault (encrypted localStorage) ---

export function hasVault(): boolean {
  return localStorage.getItem(PREFIX + 'vault') !== null;
}

export async function createVault(password: string, data: unknown): Promise<void> {
  const json = JSON.stringify(data);
  const blob = await encrypt(json, password);
  localStorage.setItem(PREFIX + 'vault', JSON.stringify(blob));
}

export async function unlockVault(password: string): Promise<unknown> {
  const raw = localStorage.getItem(PREFIX + 'vault');
  if (!raw) throw new Error('No vault found');
  const blob: EncryptedBlob = JSON.parse(raw);
  const json = await decrypt(blob, password);
  return JSON.parse(json);
}

export async function updateVault(password: string, data: unknown): Promise<void> {
  await createVault(password, data);
}

export function clearVault(): void {
  localStorage.removeItem(PREFIX + 'vault');
}

// --- Rate limiting ---

interface RateLimitState {
  failures: number;
  lockedUntil: number;
}

export function checkRateLimit(): { allowed: boolean; remainingMs: number } {
  const raw = localStorage.getItem(PREFIX + 'rateLimit');
  if (!raw) return { allowed: true, remainingMs: 0 };
  const state: RateLimitState = JSON.parse(raw);
  if (state.lockedUntil > Date.now()) {
    return { allowed: false, remainingMs: state.lockedUntil - Date.now() };
  }
  return { allowed: true, remainingMs: 0 };
}

export function recordFailure(): { locked: boolean; remainingMs: number } {
  const raw = localStorage.getItem(PREFIX + 'rateLimit');
  const state: RateLimitState = raw ? JSON.parse(raw) : { failures: 0, lockedUntil: 0 };
  
  // Reset if lock expired
  if (state.lockedUntil > 0 && state.lockedUntil <= Date.now()) {
    state.failures = 0;
    state.lockedUntil = 0;
  }
  
  state.failures++;
  if (state.failures >= 5) {
    state.lockedUntil = Date.now() + 5 * 60 * 1000; // 5 minutes
    localStorage.setItem(PREFIX + 'rateLimit', JSON.stringify(state));
    return { locked: true, remainingMs: 5 * 60 * 1000 };
  }
  localStorage.setItem(PREFIX + 'rateLimit', JSON.stringify(state));
  return { locked: false, remainingMs: 0 };
}

export function clearRateLimit(): void {
  localStorage.removeItem(PREFIX + 'rateLimit');
}

// --- Session timeout ---

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function touchActivity(): void {
  localStorage.setItem(PREFIX + 'lastActivity', String(Date.now()));
}

export function isSessionExpired(): boolean {
  const raw = localStorage.getItem(PREFIX + 'lastActivity');
  if (!raw) return true;
  return Date.now() - Number(raw) > TIMEOUT_MS;
}
