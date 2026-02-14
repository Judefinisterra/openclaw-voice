import { useCallback, useRef, useState } from 'react';
import {
  makeConnectFrame,
  makeChatSendFrame,
  makeSessionHistoryFrame,
  makeSessionListFrame,
  extractTextFromMessage,
  type WsFrame,
  type ChatEventPayload,
} from '../lib/protocol';
import type { Message, SessionInfo } from '../types';

export type GatewayStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export function useGateway() {
  const [status, setStatus] = useState<GatewayStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const configRef = useRef({ url: '', token: '', sessionKey: 'main' });
  const onCompleteRef = useRef<((text: string) => void) | null>(null);
  const connectIdRef = useRef<string | null>(null);
  const historyIdRef = useRef<string | null>(null);
  const sessionListIdRef = useRef<string | null>(null);
  const accumulatedTextRef = useRef('');
  const currentRunIdRef = useRef<string | null>(null);

  const connect = useCallback((url: string, token: string, sessionKey: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    configRef.current = { url, token, sessionKey };
    setStatus('connecting');
    setError(null);
    setMessages([]);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      const frame = makeConnectFrame(token);
      connectIdRef.current = frame.id;
      ws.send(JSON.stringify(frame));
    };

    ws.onmessage = (ev) => {
      let frame: WsFrame;
      try {
        frame = JSON.parse(ev.data) as WsFrame;
      } catch {
        return;
      }

      // Handle connect response
      if (frame.type === 'res' && frame.id === connectIdRef.current) {
        if (frame.ok) {
          setStatus('connected');
          // Fetch session history
          const histFrame = makeSessionHistoryFrame(sessionKey);
          historyIdRef.current = histFrame.id;
          ws.send(JSON.stringify(histFrame));
          // Fetch session list
          const listFrame = makeSessionListFrame();
          sessionListIdRef.current = listFrame.id;
          ws.send(JSON.stringify(listFrame));
        } else {
          setStatus('error');
          setError(frame.error?.message ?? 'Connection rejected');
        }
        return;
      }

      // Handle session list response
      if (frame.type === 'res' && frame.id === sessionListIdRef.current) {
        if (frame.ok && frame.payload) {
          const payload = frame.payload as { sessions?: Array<{ sessionKey: string; label?: string; lastMessage?: string; lastTimestamp?: number }> };
          if (payload.sessions) {
            setSessions(payload.sessions.map((s) => ({
              sessionKey: s.sessionKey,
              label: s.label,
              lastMessage: s.lastMessage,
              lastTimestamp: s.lastTimestamp,
            })));
          }
        }
        return;
      }

      // Handle history response
      if (frame.type === 'res' && frame.id === historyIdRef.current) {
        if (frame.ok && frame.payload) {
          const payload = frame.payload as { messages?: Array<{ role: string; content: Array<{ type: string; text?: string }>; timestamp?: number }> };
          if (payload.messages) {
            const histMsgs: Message[] = payload.messages
              .filter((m) => m.role === 'user' || m.role === 'assistant')
              .map((m) => ({
                role: m.role as 'user' | 'assistant',
                text: m.content
                  .filter((c) => c.type === 'text' && c.text)
                  .map((c) => c.text!)
                  .join(''),
                timestamp: m.timestamp ?? Date.now(),
              }))
              .filter((m) => m.text);
            setMessages(histMsgs);
          }
        }
        return;
      }

      // Handle chat events
      if (frame.type === 'event' && frame.event === 'chat') {
        const payload = frame.payload as unknown as ChatEventPayload;

        if (payload.state === 'delta') {
          // Reset accumulator if this is a new run
          if (payload.runId && payload.runId !== currentRunIdRef.current) {
            currentRunIdRef.current = payload.runId;
            accumulatedTextRef.current = '';
          }
          const text = extractTextFromMessage(payload.message);
          if (text) {
            accumulatedTextRef.current += text;
            setStreamingText(accumulatedTextRef.current);
          }
        }

        if (payload.state === 'final') {
          const finalText = extractTextFromMessage(payload.message);
          const completeText = finalText || accumulatedTextRef.current;

          setIsProcessing(false);
          setStreamingText('');
          accumulatedTextRef.current = '';
          currentRunIdRef.current = null;

          if (completeText) {
            setMessages((msgs) => [
              ...msgs,
              { role: 'assistant', text: completeText, timestamp: Date.now() },
            ]);
            onCompleteRef.current?.(completeText);
          }
        }

        if (payload.state === 'error') {
          setIsProcessing(false);
          setStreamingText('');
          accumulatedTextRef.current = '';
          setError('Agent error');
        }
      }
    };

    ws.onerror = () => {
      setStatus('error');
      setError('WebSocket error');
    };

    ws.onclose = () => {
      setStatus('disconnected');
      wsRef.current = null;
    };
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('disconnected');
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    setMessages((msgs) => [...msgs, { role: 'user', text, timestamp: Date.now() }]);
    setIsProcessing(true);
    setStreamingText('');
    accumulatedTextRef.current = '';
    const frame = makeChatSendFrame(text, configRef.current.sessionKey);
    wsRef.current.send(JSON.stringify(frame));
  }, []);

  const switchSession = useCallback((sessionKey: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    configRef.current.sessionKey = sessionKey;
    setMessages([]);
    setStreamingText('');
    accumulatedTextRef.current = '';
    const histFrame = makeSessionHistoryFrame(sessionKey);
    historyIdRef.current = histFrame.id;
    wsRef.current.send(JSON.stringify(histFrame));
  }, []);

  const refreshSessions = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const listFrame = makeSessionListFrame();
    sessionListIdRef.current = listFrame.id;
    wsRef.current.send(JSON.stringify(listFrame));
  }, []);

  const onResponseComplete = useCallback((cb: (text: string) => void) => {
    onCompleteRef.current = cb;
  }, []);

  const getSessionKey = useCallback(() => configRef.current.sessionKey, []);

  return {
    status,
    error,
    messages,
    streamingText,
    isProcessing,
    sessions,
    connect,
    disconnect,
    sendMessage,
    switchSession,
    refreshSessions,
    onResponseComplete,
    getSessionKey,
  };
}
