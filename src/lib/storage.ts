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
const PROFILE_VERSION = 3;

// Base tunnel URL — all agents route through path-based routing on Caddy
const TUNNEL_BASE = 'wss://particularly-fuji-fashion-delivered.trycloudflare.com';

const DEFAULT_PROFILES: Profile[] = [
  {
    id: 'brianclaw',
    name: 'BrianClaw',
    gatewayUrl: `${TUNNEL_BASE}/agent/brianclaw/`,
    authToken: 'ebdeef28524b99339de235ab20ee16846d3337fce25eed49',
    sessionKey: 'main',
    voiceUri: '',
    role: 'Right Hand to MD / Analyst',
  },
  {
    id: 'c3po',
    name: 'C3PO (CTO)',
    gatewayUrl: `${TUNNEL_BASE}/agent/c3po/`,
    authToken: 'dev-token-2026',
    sessionKey: 'main',
    voiceUri: '',
    role: 'Chief Technology Officer',
  },
  {
    id: 'ebitdai',
    name: 'EBITDAI',
    gatewayUrl: `${TUNNEL_BASE}/agent/ebitdai/`,
    authToken: '97b951b1a41f772519268f5a9d884b652ec9011b5e87b024',
    sessionKey: 'main',
    voiceUri: '',
    role: 'Product AI Agent',
  },
  {
    id: 'katycmo',
    name: 'KatyCMO',
    gatewayUrl: `${TUNNEL_BASE}/agent/katycmo/`,
    authToken: '8e32f17027ca707a2e710ab52183acf0f91bac73bfae2374',
    sessionKey: 'main',
    voiceUri: '',
    role: 'Chief Marketing Officer',
  },
  {
    id: 'freddy',
    name: 'Freddy',
    gatewayUrl: `${TUNNEL_BASE}/agent/freddy/`,
    authToken: '623114972882d441f2808e9ff13ecc890b34ce8a6b8a4b7d',
    sessionKey: 'main',
    voiceUri: '',
    role: 'Outbound Appointment Setter',
  },
  {
    id: 'alexcio',
    name: 'Alex (CIO)',
    gatewayUrl: `${TUNNEL_BASE}/agent/alexcio/`,
    authToken: '1a6ae3bc86417f4b1fd133786c80e155e81756374d7891b3',
    sessionKey: 'main',
    voiceUri: '',
    role: 'Research Analyst / Investment Scout',
  },
  {
    id: 'saminbound',
    name: 'Sam (Inbound)',
    gatewayUrl: `${TUNNEL_BASE}/agent/saminbound/`,
    authToken: 'd7f7659196f112c8ee1d8895f8051fde77c100cee4dbe363',
    sessionKey: 'main',
    voiceUri: '',
    role: 'Inbound Sales',
  },
  {
    id: 'benoiceo',
    name: 'BenoiCEO',
    gatewayUrl: `${TUNNEL_BASE}/agent/benoiceo/`,
    authToken: '65fe0ec700b0c402a4604fa0e4cf3cd18c4a715e162dd42c',
    sessionKey: 'main',
    voiceUri: '',
    role: 'Chief Executive Officer AI',
  },
  {
    id: 'samantha',
    name: 'Samantha (PM)',
    gatewayUrl: `${TUNNEL_BASE}/agent/samantha/`,
    authToken: '7c86f4aa082f44d85a6bd6813bcfeca6692316d233e757dc',
    sessionKey: 'main',
    voiceUri: '',
    role: 'Product Manager',
  },
  {
    id: 'juan',
    name: 'Juan (Upwork)',
    gatewayUrl: `${TUNNEL_BASE}/agent/juan/`,
    authToken: 'ed83ff804fd0e1f040895b8f7f6b2dc37d356f0d8f526b18',
    sessionKey: 'main',
    voiceUri: '',
    role: 'Upwork Specialist',
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
