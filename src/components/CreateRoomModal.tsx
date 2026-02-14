import { useState } from 'react';
import type { Profile, ChatRoom } from '../types';

const AVATAR_COLORS = [
  'from-purple-500 to-indigo-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
  'from-yellow-500 to-amber-600',
  'from-violet-500 to-fuchsia-600',
  'from-lime-500 to-green-600',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name.split(/[\s-]+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
  profiles: Profile[];
  onCreate: (room: ChatRoom) => void;
}

export default function CreateRoomModal({ open, onClose, profiles, onCreate }: CreateRoomModalProps) {
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  if (!open) return null;

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = () => {
    if (selectedIds.size < 2) return;
    const roomName = name.trim() || profiles.filter((p) => selectedIds.has(p.id)).map((p) => p.name.split(/[\s(]+/)[0]).join(' & ');
    const room: ChatRoom = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: roomName,
      agentIds: Array.from(selectedIds),
      created: Date.now(),
    };
    onCreate(room);
    setName('');
    setSelectedIds(new Set());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl w-full max-w-md border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">New Chat Room</h2>
          <p className="text-xs text-gray-500 mt-1">Select 2+ agents for a group conversation</p>
        </div>

        <div className="p-5 space-y-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Room name (optional)"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
            autoFocus
          />

          <div className="space-y-1 max-h-64 overflow-y-auto">
            {profiles.map((p) => {
              const selected = selectedIds.has(p.id);
              const color = getAvatarColor(p.name);
              const initials = getInitials(p.name);
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    selected ? 'bg-purple-600/20 border border-purple-500/30' : 'hover:bg-gray-800 border border-transparent'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-xs font-bold text-white">{initials}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-sm text-white">{p.name}</span>
                    {p.role && <p className="text-[10px] text-gray-500">{p.role}</p>}
                  </div>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    selected ? 'bg-purple-500 border-purple-500' : 'border-gray-600'
                  }`}>
                    {selected && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-5 border-t border-white/10 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-gray-800">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={selectedIds.size < 2}
            className="flex-1 py-2.5 text-sm font-medium bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white rounded-xl transition-colors"
          >
            Create Room ({selectedIds.size})
          </button>
        </div>
      </div>
    </div>
  );
}
