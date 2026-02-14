import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { Message, Profile } from '../types';

interface RoomTranscriptProps {
  messages: Message[];
  streamingByAgent: Record<string, string>;
  processingAgents: Set<string>;
  profiles: Profile[];
}

const AVATAR_COLORS = [
  { gradient: 'from-purple-500 to-indigo-600', text: 'text-purple-400', border: 'border-purple-500/20' },
  { gradient: 'from-blue-500 to-cyan-600', text: 'text-blue-400', border: 'border-blue-500/20' },
  { gradient: 'from-emerald-500 to-teal-600', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  { gradient: 'from-orange-500 to-red-600', text: 'text-orange-400', border: 'border-orange-500/20' },
  { gradient: 'from-pink-500 to-rose-600', text: 'text-pink-400', border: 'border-pink-500/20' },
  { gradient: 'from-yellow-500 to-amber-600', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  { gradient: 'from-violet-500 to-fuchsia-600', text: 'text-violet-400', border: 'border-violet-500/20' },
  { gradient: 'from-lime-500 to-green-600', text: 'text-lime-400', border: 'border-lime-500/20' },
];

function getColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(hash) % AVATAR_COLORS.length;
}

function getInitials(name: string): string {
  return name.split(/[\s-]+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function renderMarkdown(text: string): string {
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, _l, code) =>
    `<pre class="bg-gray-900 rounded-lg px-3 py-2 my-2 overflow-x-auto text-xs font-mono text-gray-300 border border-white/5"><code>${code.trim()}</code></pre>`
  );
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-900 px-1.5 py-0.5 rounded text-xs text-purple-300 font-mono">$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-white mt-3 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold text-white mt-3 mb-1">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-white mt-3 mb-1">$1</h1>');
  html = html.replace(/^[*-] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-purple-400 underline hover:text-purple-300">$1</a>');
  html = html.replace(/\n\n/g, '</p><p class="mt-2">');
  html = html.replace(/\n/g, '<br/>');
  return `<p>${html}</p>`;
}

function relativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function PlayButton({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false);
  const handlePlay = useCallback(() => {
    if (playing) { speechSynthesis.cancel(); setPlaying(false); return; }
    speechSynthesis.cancel();
    const cleaned = text.replace(/```[\s\S]*?```/g, ' ').replace(/`([^`]+)`/g, '$1').replace(/[#*_~]/g, '').replace(/\n+/g, '. ').slice(0, 4000);
    if (!cleaned) return;
    const utt = new SpeechSynthesisUtterance(cleaned);
    utt.onstart = () => setPlaying(true);
    utt.onend = () => setPlaying(false);
    utt.onerror = () => setPlaying(false);
    speechSynthesis.speak(utt);
  }, [text, playing]);

  return (
    <button onClick={handlePlay} className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0" title={playing ? 'Stop' : 'Play'}>
      {playing ? (
        <svg className="w-3 h-3 text-purple-400" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
      ) : (
        <svg className="w-3 h-3 text-purple-400" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
      )}
    </button>
  );
}

const PAGE_SIZE = 50;

export default function RoomTranscript({ messages, streamingByAgent, processingAgents, profiles }: RoomTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  }, []);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingByAgent, autoScroll]);

  const visibleMessages = useMemo(
    () => messages.slice(Math.max(0, messages.length - visibleCount)),
    [messages, visibleCount]
  );

  const agentColorMap = useMemo(() => {
    const map: Record<string, typeof AVATAR_COLORS[0]> = {};
    for (const p of profiles) map[p.id] = AVATAR_COLORS[getColorIndex(p.name)];
    return map;
  }, [profiles]);

  const profileMap = useMemo(() => {
    const map: Record<string, Profile> = {};
    for (const p of profiles) map[p.id] = p;
    return map;
  }, [profiles]);

  if (messages.length === 0 && Object.keys(streamingByAgent).length === 0 && processingAgents.size === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-gray-800 mx-auto mb-3 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-gray-600 text-sm">Boardroom ready</p>
          <p className="text-gray-700 text-xs mt-1">Send a message to all agents, or @mention one</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto min-h-0">
      <div className="px-4 py-3 space-y-1">
        {visibleMessages.map((m, i) => {
          if (m.role === 'user') {
            return (
              <div key={m.timestamp + '-' + i} className="flex flex-col items-end mt-3">
                <div className="max-w-[85%] md:max-w-[70%]">
                  <div className="bg-purple-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm">
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-0.5 text-right px-1">{relativeTime(m.timestamp)}</p>
                </div>
              </div>
            );
          }

          const colors = m.agentId ? agentColorMap[m.agentId] : AVATAR_COLORS[0];
          const profile = m.agentId ? profileMap[m.agentId] : null;
          const initials = profile ? getInitials(profile.name) : '?';

          return (
            <div key={m.timestamp + '-' + i} className="flex items-start gap-2.5 mt-3">
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center flex-shrink-0 mt-5`}>
                <span className="text-[10px] font-bold text-white">{initials}</span>
              </div>
              <div className="flex-1 min-w-0 max-w-[80%] md:max-w-[65%]">
                <span className={`text-[10px] font-medium ${colors.text} px-1`}>
                  {m.agentName || 'Agent'}
                  {profile?.role && <span className="text-gray-600 ml-1">· {profile.role}</span>}
                </span>
                <div className={`rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm bg-gray-800 text-gray-200 border ${colors.border} mt-0.5`}>
                  <div className="flex items-start gap-2">
                    <div className="prose-sm flex-1 leading-relaxed [&_pre]:my-1 [&_li]:my-0.5" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
                    <PlayButton text={m.text} />
                  </div>
                </div>
                <p className="text-[10px] text-gray-600 mt-0.5 px-1">{relativeTime(m.timestamp)}</p>
              </div>
            </div>
          );
        })}

        {/* Streaming */}
        {Object.entries(streamingByAgent).map(([agentId, text]) => {
          const colors = agentColorMap[agentId] || AVATAR_COLORS[0];
          const profile = profileMap[agentId];
          const initials = profile ? getInitials(profile.name) : '?';
          return (
            <div key={'stream-' + agentId} className="flex items-start gap-2.5 mt-3">
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center flex-shrink-0 mt-5`}>
                <span className="text-[10px] font-bold text-white">{initials}</span>
              </div>
              <div className="flex-1 min-w-0 max-w-[80%] md:max-w-[65%]">
                <span className={`text-[10px] font-medium ${colors.text} px-1`}>{profile?.name || 'Agent'}</span>
                <div className={`rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm bg-gray-800 text-gray-200 border ${colors.border} mt-0.5`}>
                  <div className="prose-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
                  <span className="inline-block w-1.5 h-4 bg-purple-400 animate-pulse ml-0.5 rounded-sm" />
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicators */}
        {Array.from(processingAgents).filter((id) => !streamingByAgent[id]).map((agentId) => {
          const colors = agentColorMap[agentId] || AVATAR_COLORS[0];
          const profile = profileMap[agentId];
          return (
            <div key={'typing-' + agentId} className="flex items-start gap-2 mt-3">
              <div className="flex flex-col items-start">
                <span className={`text-[10px] font-medium mb-1 px-1 ${colors.text}`}>{profile?.name || 'Agent'}</span>
                <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
