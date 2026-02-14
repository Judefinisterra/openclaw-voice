import { useEffect, useState, useRef } from 'react';
import RoomTranscript from './RoomTranscript';
import { useMultiGateway } from '../hooks/useMultiGateway';
import type { ChatRoom, Profile } from '../types';

interface RoomInterfaceProps {
  room: ChatRoom;
  profiles: Profile[];
  onOpenSidebar?: () => void;
}

export default function RoomInterface({ room, profiles, onOpenSidebar }: RoomInterfaceProps) {
  const mgw = useMultiGateway();
  const [textInput, setTextInput] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<Profile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const roomProfiles = profiles.filter((p) => room.agentIds.includes(p.id));

  // Connect to all agents in the room
  useEffect(() => {
    mgw.clearMessages();
    for (const profile of roomProfiles) {
      mgw.connectAgent(profile);
    }
    return () => {
      mgw.disconnectAll();
    };
  }, [room.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInputChange = (value: string) => {
    setTextInput(value);
    const lastAt = value.lastIndexOf('@');
    if (lastAt >= 0) {
      const partial = value.slice(lastAt + 1).toLowerCase();
      if (partial && !partial.includes(' ')) {
        setMentionSuggestions(roomProfiles.filter((p) => p.name.toLowerCase().includes(partial)));
      } else {
        setMentionSuggestions([]);
      }
    } else {
      setMentionSuggestions([]);
    }
  };

  const completeMention = (profile: Profile) => {
    const lastAt = textInput.lastIndexOf('@');
    if (lastAt >= 0) {
      setTextInput(textInput.slice(0, lastAt) + '@' + profile.name.replace(/\s+/g, '') + ' ');
      setMentionSuggestions([]);
      inputRef.current?.focus();
    }
  };

  const handleSend = () => {
    const text = textInput.trim();
    if (!text) return;
    mgw.sendMessage(text, roomProfiles, 'main');
    setTextInput('');
    setMentionSuggestions([]);
  };

  const connectedCount = Object.values(mgw.agentStatuses).filter((s) => s === 'connected').length;

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gray-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          {onOpenSidebar && (
            <button onClick={onOpenSidebar} className="md:hidden text-gray-400 hover:text-white p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <span className="text-sm text-white font-medium">{room.name}</span>
            <p className="text-[10px] text-gray-500">
              {connectedCount}/{roomProfiles.length} connected · {roomProfiles.map((p) => p.name).join(', ')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {roomProfiles.map((p) => {
            const status = mgw.agentStatuses[p.id] || 'disconnected';
            const dotColor = status === 'connected' ? 'bg-green-500' : status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500';
            return <div key={p.id} className={`w-2 h-2 rounded-full ${dotColor}`} title={`${p.name}: ${status}`} />;
          })}
        </div>
      </div>

      {/* Transcript */}
      <RoomTranscript
        messages={mgw.messages}
        streamingByAgent={mgw.streamingByAgent}
        processingAgents={mgw.processingAgents}
        profiles={roomProfiles}
      />

      {/* Mention suggestions */}
      {mentionSuggestions.length > 0 && (
        <div className="border-t border-white/10 bg-gray-900 px-4 py-2">
          <div className="flex gap-2 flex-wrap">
            {mentionSuggestions.map((p) => (
              <button key={p.id} onClick={() => completeMention(p)} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-full text-xs text-gray-300 transition-colors flex items-center gap-1.5">
                <span className="text-purple-400">@</span>{p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 border-t border-white/10 bg-gray-900/80 backdrop-blur-sm px-4 py-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={textInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            placeholder="Message room… (use @name to target)"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button onClick={handleSend} disabled={!textInput.trim()} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-30 rounded-full w-10 h-10 flex items-center justify-center transition-colors flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
