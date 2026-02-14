import type { Profile } from '../types';
import type { GatewayStatus } from '../hooks/useGateway';

interface SidebarProps {
  profiles: Profile[];
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
  onAddProfile: () => void;
  onEditProfile: (profile: Profile) => void;
  onDeleteProfile: (id: string) => void;
  onClose?: () => void;
  connectionStatus: GatewayStatus;
}

// Simple hash-based avatar colors
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
  onAddProfile,
  onEditProfile,
  onDeleteProfile,
  onClose,
  connectionStatus,
}: SidebarProps) {
  return (
    <div className="h-full flex flex-col bg-gray-950 border-r border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Agents</h2>
          <p className="text-xs text-gray-500">{profiles.length} profile{profiles.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddProfile}
            className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-500 flex items-center justify-center transition-colors"
            title="Add agent profile"
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

      {/* Profile list */}
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
              onClick={() => onSelectProfile(profile.id)}
              className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors hover:bg-gray-800/50 group ${
                isActive ? 'bg-gray-800/80 border-l-2 border-l-purple-500' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className={`relative w-10 h-10 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-sm font-bold text-white">{initials}</span>
                  {/* Connection status dot */}
                  {isActive && (
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-950 ${
                      isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                    }`} />
                  )}
                </div>

                {/* Name & info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>
                      {profile.name}
                    </span>
                    {/* Edit/delete on hover */}
                    <div className="hidden group-hover:flex items-center gap-1 ml-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditProfile(profile); }}
                        className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
                        title="Edit"
                      >
                        <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      {profiles.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteProfile(profile.id); }}
                          className="w-6 h-6 rounded bg-gray-700 hover:bg-red-600 flex items-center justify-center"
                          title="Delete"
                        >
                          <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {isConnecting ? 'Connecting...' : profile.sessionKey}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
