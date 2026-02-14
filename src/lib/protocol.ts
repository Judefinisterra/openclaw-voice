export interface WsRequest {
  type: 'req';
  method: string;
  id: string;
  params: Record<string, unknown>;
}

export interface WsResponse {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: { code: string; message: string };
}

export interface WsEvent {
  type: 'event';
  event: string;
  payload: Record<string, unknown>;
}

export type WsFrame = WsRequest | WsResponse | WsEvent;

let _reqId = 0;
export function nextId(): string {
  return String(++_reqId);
}

export function makeConnectFrame(token: string): WsRequest {
  return {
    type: 'req',
    method: 'connect',
    id: nextId(),
    params: {
      client: {
        mode: 'webchat',
        platform: 'web',
        version: '0.2.0',
        id: 'webchat',
        displayName: 'OpenClaw Voice',
      },
      auth: { token },
      minProtocol: 3,
      maxProtocol: 3,
    },
  };
}

export function makeChatSendFrame(message: string, sessionKey: string): WsRequest {
  return {
    type: 'req',
    method: 'chat.send',
    id: nextId(),
    params: {
      message,
      sessionKey,
      idempotencyKey: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    },
  };
}

export function makeSessionHistoryFrame(sessionKey: string): WsRequest {
  return {
    type: 'req',
    method: 'session.history',
    id: nextId(),
    params: { sessionKey },
  };
}

/**
 * Chat event payload shape
 */
export interface ChatEventPayload {
  runId: string;
  sessionKey: string;
  seq: number;
  state: string;
  message?: {
    role: string;
    content: Array<{ type: string; text?: string }>;
    timestamp: number;
  };
}

/** Extract text from a chat event payload message */
export function extractTextFromMessage(message: ChatEventPayload['message']): string {
  if (!message?.content) return '';
  return message.content
    .filter((c) => c.type === 'text' && c.text)
    .map((c) => c.text!)
    .join('');
}
