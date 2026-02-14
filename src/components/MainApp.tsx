import { useState, useCallback, useEffect, useRef } from 'react';
import VoiceInterface from './VoiceInterface';
import Sidebar from './Sidebar';
import { useGateway } from '../hooks/useGateway';
import { saveActiveProfileId, loadActiveProfileId } from '../lib/storage';
import { updateVault } from '../lib/crypto';
import type { Profile, Message } from '../types';

interface MainAppProps {
  profiles: Profile[];
  password: string;
  onLock: () => void;
}

export default function MainApp({ profiles: initialProfiles, password, onLock }: MainAppProps) {
  const gw = useGateway();
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [activeProfileId, setActiveProfileId] = useState(() => {
    const saved = loadActiveProfileId();
    return initialProfiles.find((p) => p.id === saved) ? saved : initialProfiles[0]?.id ?? '';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messageCacheRef = useRef<Record<string, Message[]>>({});
  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];

  // Save messages to cache when they change
  useEffect(() => {
    if (activeProfile && gw.messages.length > 0) {
      messageCacheRef.current[activeProfile.id] = gw.messages;
    }
  }, [gw.messages, activeProfile]);

  // Auto-connect to active profile on mount
  useEffect(() => {
    if (activeProfile && gw.status === 'disconnected') {
      gw.connect(activeProfile.gatewayUrl, activeProfile.authToken, activeProfile.sessionKey);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save profiles to vault whenever they change
  const saveToVault = useCallback(
    async (newProfiles: Profile[]) => {
      setProfiles(newProfiles);
      await updateVault(password, newProfiles);
    },
    [password]
  );

  const switchToProfile = useCallback(
    (profileId: string) => {
      if (profileId === activeProfileId && gw.status === 'connected') return;
      const profile = profiles.find((p) => p.id === profileId);
      if (!profile) return;

      if (activeProfile && gw.messages.length > 0) {
        messageCacheRef.current[activeProfile.id] = gw.messages;
      }

      setActiveProfileId(profileId);
      saveActiveProfileId(profileId);

      if (gw.status === 'connected' || gw.status === 'connecting') {
        gw.disconnect();
      }
      setTimeout(() => {
        gw.connect(profile.gatewayUrl, profile.authToken, profile.sessionKey);
      }, 50);
    },
    [activeProfileId, profiles, activeProfile, gw],
  );

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div
        className={`
          fixed inset-0 z-40 md:relative md:z-auto
          ${sidebarOpen ? 'block' : 'hidden'} md:block
        `}
      >
        <div
          className="absolute inset-0 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="relative w-72 h-full z-10">
          <Sidebar
            profiles={profiles}
            activeProfileId={activeProfileId}
            onSelectProfile={(id) => {
              switchToProfile(id);
              setSidebarOpen(false);
            }}
            onClose={() => setSidebarOpen(false)}
            connectionStatus={gw.status}
            onLock={onLock}
          />
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 min-w-0">
        {activeProfile && (
          <VoiceInterface
            gatewayStatus={gw.status}
            messages={gw.messages}
            streamingText={gw.streamingText}
            isProcessing={gw.isProcessing}
            sendMessage={gw.sendMessage}
            disconnect={gw.disconnect}
            onResponseComplete={gw.onResponseComplete}
            reconnect={(url, token, sessionKey) => gw.connect(url, token, sessionKey)}
            gatewayUrl={activeProfile.gatewayUrl}
            authToken={activeProfile.authToken}
            profileName={activeProfile.name}
            onOpenSidebar={() => setSidebarOpen(true)}
            sessionKey={activeProfile.sessionKey}
          />
        )}
      </div>
    </div>
  );
}
