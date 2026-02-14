import { useState, useRef, useEffect } from 'react';
import type { Message } from '../types';

interface TranscriptProps {
  messages: Message[];
  streamingText: string;
}

export default function Transcript({ messages, streamingText }: TranscriptProps) {
  const [expanded, setExpanded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  if (messages.length === 0 && !streamingText) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-white/10">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 text-xs text-gray-400 hover:text-gray-200 flex items-center justify-center gap-1"
      >
        <span>{expanded ? '▼' : '▲'}</span>
        <span>Transcript ({messages.length})</span>
      </button>
      {expanded && (
        <div className="max-h-48 overflow-y-auto px-4 pb-4 space-y-2">
          {messages.map((m, i) => (
            <div key={i} className={`text-sm ${m.role === 'user' ? 'text-blue-300' : 'text-green-300'}`}>
              <span className="font-bold opacity-60">{m.role === 'user' ? 'You' : 'Agent'}:</span>{' '}
              {m.text}
            </div>
          ))}
          {streamingText && (
            <div className="text-sm text-yellow-300 opacity-70">
              <span className="font-bold opacity-60">Agent:</span> {streamingText}...
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
