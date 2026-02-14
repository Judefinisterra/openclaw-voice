export type OrbState = 'idle' | 'listening' | 'processing' | 'speaking' | 'vad-ready';

export interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  agentId?: string;
  agentName?: string;
}

export interface ConnectionConfig {
  gatewayUrl: string;
  authToken: string;
  sessionKey: string;
}

export interface Settings {
  voiceUri: string;
  autoListen: boolean;
  sessionKey: string;
  vadEnabled: boolean;
  elevenLabsVoiceId: string;
}

export interface Profile {
  id: string;
  name: string;
  gatewayUrl: string;
  authToken: string;
  sessionKey: string;
  voiceUri: string;
  elevenLabsVoiceId?: string;
  role?: string;
}

export interface SessionInfo {
  sessionKey: string;
  label?: string;
  lastMessage?: string;
  lastTimestamp?: number;
}

export interface ChatRoom {
  id: string;
  name: string;
  agentIds: string[];
  created: number;
}

export interface VaultData {
  profiles: Profile[];
  rooms: ChatRoom[];
}

export type ChatTarget =
  | { type: 'agent'; profileId: string }
  | { type: 'room'; roomId: string };
