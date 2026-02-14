import { useRef, useEffect, useState, useCallback } from 'react';
import type { Message } from '../types';

interface TranscriptProps {
  messages: Message[];
  streamingText: string;
}

function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' code block omitted ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .slice(0, 4000)
    .trim();
}

function PlayButton({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false);

  const handlePlay = useCallback(() => {
    if (playing) {
      speechSynthesis.cancel();
      setPlaying(false);
      return;
    }

    speechSynthesis.cancel();
    const cleaned = cleanForSpeech(text);
    if (!cleaned) return;

    const utt = new SpeechSynthesisUtterance(cleaned);
    utt.onstart = () => setPlaying(true);
    utt.onend = () => setPlaying(false);
    utt.onerror = () => setPlaying(false);
    speechSynthesis.speak(utt);
  }, [text, playing]);

  return (
    <button
      onClick={handlePlay}
      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0 ml-2"
      title={playing ? 'Stop' : 'Play'}
    >
      {playing ? (
        <svg className="w-3.5 h-3.5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  );
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
            <div className="flex items-start gap-1">
              <p className="whitespace-pre-wrap flex-1">{m.text}</p>
              {m.role === 'assistant' && <PlayButton text={m.text} />}
            </div>
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
