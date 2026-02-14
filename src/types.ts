export type OrbState = 'idle' | 'listening' | 'processing' | 'speaking';

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
}
