import type { Profile, ChatRoom, ChatTarget } from '../types';
import type { GatewayStatus } from '../hooks/useGateway';

interface SidebarProps {
  profiles: Profile[];
  rooms: ChatRoom[];
  activeTarget: ChatTarget;
  onSelectAgent: (id: string) => void;
  onSelectRoom: (id: string) => void;
  onClose?: () => void;
  connectionStatus: GatewayStatus;
  onLock?: () => void;
  onCreateRoom?: () => void;
}

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
  return name
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function Sidebar({
  profiles,
  rooms,
  activeTarget,
  onSelectAgent,
  onSelectRoom,
  onClose,
  connectionStatus,
  onLock,
  onCreateRoom,
}: SidebarProps) {
  return (
    <div className="h-full flex flex-col bg-gray-950 border-r border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Agents</h2>
          <p className="text-xs text-gray-500">{profiles.length} agents{rooms.length > 0 && ` · ${rooms.length} rooms`}</p>
        </div>
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

      {/* Lists */}
      <div className="flex-1 overflow-y-auto">
        {/* Rooms section */}
        {rooms.length > 0 && (
          <>
            <div className="px-4 pt-3 pb-1">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Rooms</span>
            </div>
            {rooms.map((room) => {
              const isActive = activeTarget.type === 'room' && activeTarget.roomId === room.id;
              const memberNames = room.agentIds
                .map((id) => profiles.find((p) => p.id === id)?.name)
                .filter(Boolean)
                .map((n) => n!.split(/[\s(]+/)[0])
                .join(', ');

              return (
                <button
                  key={room.id}
                  onClick={() => { onSelectRoom(room.id); onClose?.(); }}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors hover:bg-gray-800/50 ${
                    isActive ? 'bg-gray-800/80 border-l-2 border-l-amber-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium truncate block ${isActive ? 'text-white' : 'text-gray-300'}`}>
                        {room.name}
                      </span>
                      <p className="text-xs text-gray-500 truncate">{memberNames}</p>
                    </div>
                    <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded-full">{room.agentIds.length}</span>
                  </div>
                </button>
              );
            })}
          </>
        )}

        {/* Agents section */}
        <div className="px-4 pt-3 pb-1">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Agents</span>
        </div>
        {profiles.map((profile) => {
          const isActive = activeTarget.type === 'agent' && activeTarget.profileId === profile.id;
          const initials = getInitials(profile.name);
          const colorClass = getAvatarColor(profile.name);
          const isConnected = isActive && connectionStatus === 'connected';
          const isConnecting = isActive && connectionStatus === 'connecting';

          return (
            <button
              key={profile.id}
              onClick={() => { onSelectAgent(profile.id); onClose?.(); }}
              className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors hover:bg-gray-800/50 ${
                isActive ? 'bg-gray-800/80 border-l-2 border-l-purple-500' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`relative w-10 h-10 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-sm font-bold text-white">{initials}</span>
                  {isActive && (
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-950 ${
                      isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                    }`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium truncate block ${isActive ? 'text-white' : 'text-gray-300'}`}>
                    {profile.name}
                  </span>
                  <p className="text-xs text-gray-500 truncate">
                    {isConnecting ? 'Connecting...' : profile.role || profile.sessionKey}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom actions */}
      <div className="p-3 border-t border-white/10 space-y-1">
        {onCreateRoom && (
          <button
            onClick={onCreateRoom}
            className="w-full flex items-center justify-center gap-2 text-xs text-purple-400 hover:text-purple-300 py-2 rounded-lg hover:bg-purple-500/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Room
          </button>
        )}
        {onLock && (
          <button
            onClick={onLock}
            className="w-full flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-gray-300 py-2 rounded-lg hover:bg-gray-800/50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Lock
          </button>
        )}
      </div>
    </div>
  );
}
