import type { Profile, ChatRoom } from '../types';

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

// Profile helpers — no hardcoded tokens!
// Profiles are stored encrypted in the vault (see crypto.ts).
// These helpers work with the decrypted in-memory profiles.

const EMPTY_PROFILES: Profile[] = [];

export function loadProfiles(): Profile[] {
  // Profiles should come from the vault, not localStorage directly.
  // This is a fallback for non-auth code paths during migration.
  return load<Profile[]>('profiles', EMPTY_PROFILES);
}

export function saveProfiles(profiles: Profile[]): void {
  save('profiles', profiles);
}

export function loadActiveProfileId(): string {
  return load<string>('activeProfileId', '');
}

export function saveActiveProfileId(id: string): void {
  save('activeProfileId', id);
}

// ElevenLabs
export function loadElevenLabsKey(): string {
  return load<string>('elevenLabsApiKey', '');
}

export function saveElevenLabsKey(key: string): void {
  save('elevenLabsApiKey', key);
}

// VAD / listening mode
export function loadListeningMode(): boolean {
  return load<boolean>('listeningMode', true);
}

export function saveListeningMode(enabled: boolean): void {
  save('listeningMode', enabled);
}

// Chat rooms (will be stored encrypted in vault alongside profiles)
export function loadRooms(): ChatRoom[] {
  return load<ChatRoom[]>('rooms', []);
}

export function saveRooms(rooms: ChatRoom[]): void {
  save('rooms', rooms);
}

// Active context (single agent or room)
export function loadActiveContext(): { type: 'single'; profileId: string } | { type: 'room'; roomId: string } | null {
  return load<{ type: 'single'; profileId: string } | { type: 'room'; roomId: string } | null>('activeContext', null);
}

export function saveActiveContext(context: { type: 'single'; profileId: string } | { type: 'room'; roomId: string }): void {
  save('activeContext', context);
}
