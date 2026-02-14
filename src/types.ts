export type OrbState = 'idle' | 'listening' | 'processing' | 'speaking' | 'vad-ready';

export interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
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
