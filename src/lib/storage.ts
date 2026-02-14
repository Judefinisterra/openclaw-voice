import type { Profile } from '../types';

const PREFIX = 'openclaw-voice:';

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

// Profile helpers
const PROFILE_VERSION = 2;
const DEFAULT_PROFILES: Profile[] = [
  {
    id: 'c3po',
    name: 'C3-PO',
    gatewayUrl: 'wss://particularly-fuji-fashion-delivered.trycloudflare.com',
    authToken: 'dev-token-2026',
    sessionKey: 'main',
    voiceUri: '',
  },
];

export function loadProfiles(): Profile[] {
  const ver = load<number>('profileVersion', 0);
  if (ver < PROFILE_VERSION) {
    save('profileVersion', PROFILE_VERSION);
    save('profiles', DEFAULT_PROFILES);
    return DEFAULT_PROFILES;
  }
  return load<Profile[]>('profiles', DEFAULT_PROFILES);
}

export function saveProfiles(profiles: Profile[]): void {
  save('profiles', profiles);
}

export function loadActiveProfileId(): string {
  return load<string>('activeProfileId', DEFAULT_PROFILES[0].id);
}

export function saveActiveProfileId(id: string): void {
  save('activeProfileId', id);
}
