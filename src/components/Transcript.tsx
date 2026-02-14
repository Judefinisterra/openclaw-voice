import { useState, useRef, useEffect } from 'react';
import type { Message } from '../types';

interface TranscriptProps {
  messages: Message[];
  streamingText: string;
}

export default function Transcript({ messages, streamingText }: TranscriptProps) {
  const [collapsed, setCollapsed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  if (messages.length === 0 && !streamingText) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-white/10">
      {/* Toggle bar */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-4 py-2 text-xs text-gray-400 hover:text-gray-200 flex items-center justify-center gap-1"
      >
        <span>{collapsed ? '▲' : '▼'}</span>
        <span>Chat ({messages.length})</span>
      </button>

      {!collapsed && (
        <div className="max-h-64 overflow-y-auto px-4 pb-4 space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-800 text-gray-200 rounded-bl-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
                <p className="text-[10px] opacity-40 mt-1">
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {streamingText && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl px-4 py-2 text-sm bg-gray-800 text-yellow-200 rounded-bl-sm">
                <p className="whitespace-pre-wrap">{streamingText}</p>
                <span className="inline-block w-2 h-4 bg-yellow-300 animate-pulse ml-0.5" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
