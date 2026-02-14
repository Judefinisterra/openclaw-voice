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

// Pre-encrypted vault blob (Password#1 + 10 agents)
// Tokens are AES-256-GCM encrypted — safe to embed in source
const SEED_VAULT = '{"salt":"cv6A5RpRu0XEmgpHNMoPSA==","iv":"tezlIq/ApcCANZbP","data":"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","version":1}';

export function hasVault(): boolean {
  // Auto-seed vault on first visit
  if (localStorage.getItem(PREFIX + 'vault') === null) {
    localStorage.setItem(PREFIX + 'vault', SEED_VAULT);
  }
  return true;
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
