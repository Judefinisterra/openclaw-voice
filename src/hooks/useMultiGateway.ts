import { useCallback, useRef, useState } from 'react';
import {
  makeConnectFrame,
  makeChatSendFrame,
  extractTextFromMessage,
  type WsFrame,
  type ChatEventPayload,
} from '../lib/protocol';
import type { Message, Profile } from '../types';

export type AgentConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface AgentConnection {
  ws: WebSocket | null;
  status: AgentConnectionStatus;
  connectId: string | null;
  accumulatedText: string;
  currentRunId: string | null;
  streamingText: string;
  isProcessing: boolean;
}

/**
 * Manages multiple simultaneous WebSocket connections for a chat room.
 */
export function useMultiGateway() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentConnectionStatus>>({});
  const [streamingByAgent, setStreamingByAgent] = useState<Record<string, string>>({});
  const [processingAgents, setProcessingAgents] = useState<Set<string>>(new Set());

  const connectionsRef = useRef<Record<string, AgentConnection>>({});

  const updateStatus = useCallback((agentId: string, status: AgentConnectionStatus) => {
    setAgentStatuses((prev) => ({ ...prev, [agentId]: status }));
  }, []);

  const connectAgent = useCallback((profile: Profile) => {
    const existing = connectionsRef.current[profile.id];
    if (existing?.ws) {
      existing.ws.close();
    }

    const conn: AgentConnection = {
      ws: null,
      status: 'connecting',
      connectId: null,
      accumulatedText: '',
      currentRunId: null,
      streamingText: '',
      isProcessing: false,
    };
    connectionsRef.current[profile.id] = conn;
    updateStatus(profile.id, 'connecting');

    const ws = new WebSocket(profile.gatewayUrl);
    conn.ws = ws;

    ws.onopen = () => {
      const frame = makeConnectFrame(profile.authToken);
      conn.connectId = frame.id;
      ws.send(JSON.stringify(frame));
    };

    ws.onmessage = (ev) => {
      let frame: WsFrame;
      try {
        frame = JSON.parse(ev.data) as WsFrame;
      } catch {
        return;
      }

      if (frame.type === 'res' && frame.id === conn.connectId) {
        if (frame.ok) {
          conn.status = 'connected';
          updateStatus(profile.id, 'connected');
        } else {
          conn.status = 'error';
          updateStatus(profile.id, 'error');
        }
        return;
      }

      if (frame.type === 'event' && frame.event === 'chat') {
        const payload = frame.payload as unknown as ChatEventPayload;

        if (payload.state === 'delta') {
          if (payload.runId && payload.runId !== conn.currentRunId) {
            conn.currentRunId = payload.runId;
            conn.accumulatedText = '';
          }
          const text = extractTextFromMessage(payload.message);
          if (text) {
            conn.accumulatedText += text;
            conn.streamingText = conn.accumulatedText;
            setStreamingByAgent((prev) => ({ ...prev, [profile.id]: conn.accumulatedText }));
          }
        }

        if (payload.state === 'final') {
          const finalText = extractTextFromMessage(payload.message);
          const completeText = finalText || conn.accumulatedText;

          conn.isProcessing = false;
          conn.streamingText = '';
          conn.accumulatedText = '';
          conn.currentRunId = null;

          setStreamingByAgent((prev) => {
            const next = { ...prev };
            delete next[profile.id];
            return next;
          });
          setProcessingAgents((prev) => {
            const next = new Set(prev);
            next.delete(profile.id);
            return next;
          });

          if (completeText) {
            setMessages((msgs) => [
              ...msgs,
              {
                role: 'assistant',
                text: completeText,
                timestamp: Date.now(),
                agentId: profile.id,
                agentName: profile.name,
              },
            ]);
          }
        }

        if (payload.state === 'error') {
          conn.isProcessing = false;
          conn.streamingText = '';
          conn.accumulatedText = '';
          setStreamingByAgent((prev) => {
            const next = { ...prev };
            delete next[profile.id];
            return next;
          });
          setProcessingAgents((prev) => {
            const next = new Set(prev);
            next.delete(profile.id);
            return next;
          });
        }
      }
    };

    ws.onerror = () => {
      conn.status = 'error';
      updateStatus(profile.id, 'error');
    };

    ws.onclose = () => {
      conn.status = 'disconnected';
      conn.ws = null;
      updateStatus(profile.id, 'disconnected');
    };
  }, [updateStatus]);

  const disconnectAll = useCallback(() => {
    for (const [id, conn] of Object.entries(connectionsRef.current)) {
      conn.ws?.close();
      conn.ws = null;
    }
    connectionsRef.current = {};
    setAgentStatuses({});
    setStreamingByAgent({});
    setProcessingAgents(new Set());
  }, []);

  const sendToAgent = useCallback((agentId: string, text: string, sessionKey: string) => {
    const conn = connectionsRef.current[agentId];
    if (!conn?.ws || conn.ws.readyState !== WebSocket.OPEN) return;
    conn.isProcessing = true;
    conn.accumulatedText = '';
    conn.streamingText = '';
    setProcessingAgents((prev) => new Set(prev).add(agentId));
    const frame = makeChatSendFrame(text, sessionKey);
    conn.ws.send(JSON.stringify(frame));
  }, []);

  /** Parse @ mentions and send to appropriate agents */
  const sendMessage = useCallback((text: string, profiles: Profile[], sessionKey: string) => {
    // Add user message
    setMessages((msgs) => [...msgs, { role: 'user', text, timestamp: Date.now() }]);

    // Parse @mentions
    const mentionRegex = /@(\S+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1].toLowerCase());
    }

    if (mentions.length > 0) {
      // Send to mentioned agents only
      for (const profile of profiles) {
        const nameLower = profile.name.toLowerCase().replace(/\s+/g, '');
        if (mentions.some((m) => nameLower.includes(m) || m.includes(nameLower))) {
          sendToAgent(profile.id, text, sessionKey);
        }
      }
    } else {
      // Broadcast to all agents
      for (const profile of profiles) {
        sendToAgent(profile.id, text, sessionKey);
      }
    }
  }, [sendToAgent]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamingByAgent({});
    setProcessingAgents(new Set());
  }, []);

  return {
    messages,
    agentStatuses,
    streamingByAgent,
    processingAgents,
    connectAgent,
    disconnectAll,
    sendMessage,
    clearMessages,
  };
}
