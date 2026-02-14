import { useState, useCallback, useEffect, useRef } from 'react';
import VoiceInterface from './components/VoiceInterface';
import Sidebar from './components/Sidebar';
import ProfileManager from './components/ProfileManager';
import { useGateway } from './hooks/useGateway';
import { loadProfiles, saveProfiles, loadActiveProfileId, saveActiveProfileId } from './lib/storage';
import type { Profile, Message } from './types';

function generateId() {
  return Math.random().toString(36).slice(2, 8);
}

export default function App() {
  const gw = useGateway();
  const [profiles, setProfiles] = useState<Profile[]>(loadProfiles);
  const [activeProfileId, setActiveProfileId] = useState(loadActiveProfileId);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfileManager, setShowProfileManager] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  // Cache messages per profile so switching back is instant
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

  const switchToProfile = useCallback(
    (profileId: string) => {
      if (profileId === activeProfileId && gw.status === 'connected') return;

      const profile = profiles.find((p) => p.id === profileId);
      if (!profile) return;

      // Save current messages to cache before switching
      if (activeProfile && gw.messages.length > 0) {
        messageCacheRef.current[activeProfile.id] = gw.messages;
      }

      setActiveProfileId(profileId);
      saveActiveProfileId(profileId);

      // Disconnect and reconnect to new profile's gateway
      if (gw.status === 'connected' || gw.status === 'connecting') {
        gw.disconnect();
      }
      // Small delay to let disconnect clean up
      setTimeout(() => {
        gw.connect(profile.gatewayUrl, profile.authToken, profile.sessionKey);
      }, 50);
    },
    [activeProfileId, profiles, activeProfile, gw],
  );

  const handleSaveProfile = useCallback(
    (profile: Profile) => {
      const exists = profiles.some((p) => p.id === profile.id);
      const updated = exists
        ? profiles.map((p) => (p.id === profile.id ? profile : p))
        : [...profiles, profile];
      setProfiles(updated);
      saveProfiles(updated);
      setShowProfileManager(false);
      setEditingProfile(null);

      // If editing the active profile, reconnect with new settings
      if (profile.id === activeProfileId) {
        gw.disconnect();
        setTimeout(() => {
          gw.connect(profile.gatewayUrl, profile.authToken, profile.sessionKey);
        }, 50);
      }
    },
    [profiles, activeProfileId, gw],
  );

  const handleDeleteProfile = useCallback(
    (id: string) => {
      const updated = profiles.filter((p) => p.id !== id);
      if (updated.length === 0) return;
      setProfiles(updated);
      saveProfiles(updated);
      if (id === activeProfileId) {
        switchToProfile(updated[0].id);
      }
    },
    [profiles, activeProfileId, switchToProfile],
  );

  const handleAddProfile = useCallback(() => {
    setEditingProfile({
      id: generateId(),
      name: 'New Agent',
      gatewayUrl: 'wss://',
      authToken: '',
      sessionKey: 'main',
      voiceUri: '',
    });
    setShowProfileManager(true);
  }, []);

  const handleEditProfile = useCallback((profile: Profile) => {
    setEditingProfile({ ...profile });
    setShowProfileManager(true);
  }, []);

  // No profiles at all — show onboarding
  if (profiles.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 px-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">OpenClaw Voice</h1>
          <p className="text-gray-400 text-sm">Add your first agent profile to get started</p>
          <button
            onClick={handleAddProfile}
            className="bg-purple-600 hover:bg-purple-500 rounded-lg px-6 py-3 font-medium transition-colors"
          >
            + Add Agent Profile
          </button>
        </div>
        {showProfileManager && editingProfile && (
          <ProfileManager
            profile={editingProfile}
            onSave={handleSaveProfile}
            onCancel={() => { setShowProfileManager(false); setEditingProfile(null); }}
          />
        )}
      </div>
    );
  }

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
            onAddProfile={handleAddProfile}
            onEditProfile={handleEditProfile}
            onDeleteProfile={handleDeleteProfile}
            onClose={() => setSidebarOpen(false)}
            connectionStatus={gw.status}
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

      {/* Profile manager modal */}
      {showProfileManager && editingProfile && (
        <ProfileManager
          profile={editingProfile}
          onSave={handleSaveProfile}
          onCancel={() => { setShowProfileManager(false); setEditingProfile(null); }}
        />
      )}
    </div>
  );
}
