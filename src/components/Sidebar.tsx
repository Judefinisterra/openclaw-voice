import type { Profile } from '../types';
import type { GatewayStatus } from '../hooks/useGateway';

interface SidebarProps {
  profiles: Profile[];
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
  onClose?: () => void;
  connectionStatus: GatewayStatus;
  onLock?: () => void;
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
  activeProfileId,
  onSelectProfile,
  onClose,
  connectionStatus,
  onLock,
}: SidebarProps) {
  return (
    <div className="h-full flex flex-col bg-gray-950 border-r border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Agents</h2>
          <p className="text-xs text-gray-500">{profiles.length} agents</p>
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

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto">
        {profiles.map((profile) => {
          const isActive = profile.id === activeProfileId;
          const initials = getInitials(profile.name);
          const colorClass = getAvatarColor(profile.name);
          const isConnected = isActive && connectionStatus === 'connected';
          const isConnecting = isActive && connectionStatus === 'connecting';

          return (
            <button
              key={profile.id}
              onClick={() => { onSelectProfile(profile.id); onClose?.(); }}
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

      {/* Lock button */}
      {onLock && (
        <div className="p-3 border-t border-white/10">
          <button
            onClick={onLock}
            className="w-full flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-gray-300 py-2 rounded-lg hover:bg-gray-800/50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Lock
          </button>
        </div>
      )}
    </div>
  );
}
