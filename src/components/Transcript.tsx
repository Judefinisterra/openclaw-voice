import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { Message } from '../types';

interface TranscriptProps {
  messages: Message[];
  streamingText: string;
  isProcessing?: boolean;
}

// --- Simple markdown renderer (no deps) ---

function renderMarkdown(text: string): string {
  let html = escapeHtml(text);

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, _lang, code) =>
    `<pre class="bg-gray-900 rounded-lg px-3 py-2 my-2 overflow-x-auto text-xs font-mono text-gray-300 border border-white/5"><code>${code.trim()}</code></pre>`
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-900 px-1.5 py-0.5 rounded text-xs text-purple-300 font-mono">$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');

  // Italic
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-white mt-3 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold text-white mt-3 mb-1">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-white mt-3 mb-1">$1</h1>');

  // Unordered lists
  html = html.replace(/^[*-] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-purple-400 underline hover:text-purple-300">$1</a>');

  // Line breaks (double newline = paragraph break, single = <br>)
  html = html.replace(/\n\n/g, '</p><p class="mt-2">');
  html = html.replace(/\n/g, '<br/>');

  return `<p>${html}</p>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- Relative time ---

function relativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// --- TTS Play button ---

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
      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
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

// --- Typing indicator ---

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

// --- Message grouping ---

interface MessageGroup {
  role: 'user' | 'assistant';
  messages: Message[];
}

function groupMessages(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    if (last && last.role === msg.role) {
      last.messages.push(msg);
    } else {
      groups.push({ role: msg.role, messages: [msg] });
    }
  }
  return groups;
}

// --- Pagination ---
const PAGE_SIZE = 50;

export default function Transcript({ messages, streamingText, isProcessing }: TranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [, setTick] = useState(0);

  // Update relative times every 30s
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // Smart auto-scroll: disable when user scrolls up
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAutoScroll(atBottom);

    // Load more messages when scrolling to top
    if (el.scrollTop < 100 && visibleCount < messages.length) {
      const prevHeight = el.scrollHeight;
      setVisibleCount((v) => Math.min(v + PAGE_SIZE, messages.length));
      // Maintain scroll position
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight - prevHeight;
      });
    }
  }, [visibleCount, messages.length]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingText, autoScroll]);

  // Reset visible count when messages change significantly (new agent)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setAutoScroll(true);
  }, [messages.length === 0]); // eslint-disable-line

  const visibleMessages = useMemo(
    () => messages.slice(Math.max(0, messages.length - visibleCount)),
    [messages, visibleCount]
  );
  const groups = useMemo(() => groupMessages(visibleMessages), [visibleMessages]);
  const hasMore = visibleCount < messages.length;

  if (messages.length === 0 && !streamingText && !isProcessing) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-gray-800 mx-auto mb-3 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-gray-600 text-sm">No messages yet</p>
          <p className="text-gray-700 text-xs mt-1">Start talking or type below</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto min-h-0">
      <div className="px-4 py-3 space-y-1">
        {hasMore && (
          <div className="text-center py-2">
            <button
              onClick={() => setVisibleCount((v) => Math.min(v + PAGE_SIZE, messages.length))}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Load earlier messages
            </button>
          </div>
        )}

        {groups.map((group, gi) => (
          <div key={gi} className={`flex flex-col ${group.role === 'user' ? 'items-end' : 'items-start'} gap-0.5`}>
            {group.messages.map((m, mi) => {
              const isFirst = mi === 0;
              const isLast = mi === group.messages.length - 1;
              return (
                <div key={m.timestamp + '-' + mi} className={`max-w-[85%] md:max-w-[70%] ${isFirst ? 'mt-3' : ''}`}>
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm ${
                      group.role === 'user'
                        ? 'bg-purple-600 text-white' + (isLast ? ' rounded-br-sm' : '')
                        : 'bg-gray-800 text-gray-200' + (isLast ? ' rounded-bl-sm' : '')
                    }`}
                  >
                    {group.role === 'assistant' ? (
                      <div className="flex items-start gap-2">
                        <div
                          className="prose-sm flex-1 leading-relaxed [&_pre]:my-1 [&_li]:my-0.5"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }}
                        />
                        <PlayButton text={m.text} />
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    )}
                  </div>
                  {isLast && (
                    <p className={`text-[10px] text-gray-600 mt-0.5 ${group.role === 'user' ? 'text-right' : ''} px-1`}>
                      {relativeTime(m.timestamp)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Streaming text */}
        {streamingText && (
          <div className="flex justify-start mt-3">
            <div className="max-w-[85%] md:max-w-[70%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm bg-gray-800 text-gray-200">
              <div
                className="prose-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingText) }}
              />
              <span className="inline-block w-1.5 h-4 bg-purple-400 animate-pulse ml-0.5 rounded-sm" />
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isProcessing && !streamingText && (
          <div className="mt-3">
            <TypingIndicator />
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
