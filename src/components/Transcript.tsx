import { useRef, useEffect } from 'react';
import type { Message } from '../types';

interface TranscriptProps {
  messages: Message[];
  streamingText: string;
}

export default function Transcript({ messages, streamingText }: TranscriptProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  if (messages.length === 0 && !streamingText) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <p className="text-gray-600 text-sm text-center">No messages yet. Start talking or type below.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-3">
      {messages.map((m, i) => (
        <div
          key={i}
          className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
              m.role === 'user'
                ? 'bg-purple-600 text-white rounded-br-sm'
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
          <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm bg-gray-800 text-yellow-200 rounded-bl-sm">
            <p className="whitespace-pre-wrap">{streamingText}</p>
            <span className="inline-block w-2 h-4 bg-yellow-300 animate-pulse ml-0.5" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
