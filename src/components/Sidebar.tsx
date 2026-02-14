import { useState } from 'react';
import type { SessionInfo } from '../types';

interface SidebarProps {
  sessions: SessionInfo[];
  activeSessionKey: string;
  onSelectSession: (key: string) => void;
  onNewSession: () => void;
  onClose?: () => void;
  profileName: string;
}

export default function Sidebar({
  sessions,
  activeSessionKey,
  onSelectSession,
  onNewSession,
  onClose,
  profileName,
}: SidebarProps) {
  const [newSessionName, setNewSessionName] = useState('');
  const [showNew, setShowNew] = useState(false);

  const displaySessions = sessions.length > 0
    ? sessions
    : [{ sessionKey: 'main', label: 'Main', lastMessage: undefined, lastTimestamp: undefined }];

  const handleCreate = () => {
    const key = newSessionName.trim() || `session-${Date.now()}`;
    setNewSessionName('');
    setShowNew(false);
    onSelectSession(key);
  };

  return (
    <div className="h-full flex flex-col bg-gray-950 border-r border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Chats</h2>
          <p className="text-xs text-gray-500">{profileName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowNew(true); }}
            className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-500 flex items-center justify-center transition-colors"
            title="New session"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* New session input */}
      {showNew && (
        <div className="p-3 border-b border-white/10 flex gap-2">
          <input
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            placeholder="Session name..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowNew(false); }}
          />
          <button
            onClick={handleCreate}
            className="bg-purple-600 hover:bg-purple-500 rounded-lg px-3 py-2 text-sm"
          >
            Go
          </button>
        </div>
      )}

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {displaySessions.map((s) => {
          const isActive = s.sessionKey === activeSessionKey;
          return (
            <button
              key={s.sessionKey}
              onClick={() => {
                onSelectSession(s.sessionKey);
                onClose?.();
              }}
              className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors hover:bg-gray-800/50 ${
                isActive ? 'bg-gray-800/80 border-l-2 border-l-purple-500' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>
                  {s.label || s.sessionKey}
                </span>
                {s.lastTimestamp && (
                  <span className="text-[10px] text-gray-500 ml-2 flex-shrink-0">
                    {new Date(s.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              {s.lastMessage && (
                <p className="text-xs text-gray-500 truncate mt-0.5">{s.lastMessage}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
