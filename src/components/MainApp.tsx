import { useState, useCallback, useEffect, useRef } from 'react';
import VoiceInterface from './VoiceInterface';
import RoomInterface from './RoomInterface';
import Sidebar from './Sidebar';
import CreateRoomModal from './CreateRoomModal';
import { useGateway } from '../hooks/useGateway';
import { saveActiveProfileId, loadActiveProfileId, load, save } from '../lib/storage';
import { updateVault } from '../lib/crypto';
import type { Profile, ChatRoom, ChatTarget, Message, VaultData } from '../types';

interface MainAppProps {
  profiles: Profile[];
  rooms: ChatRoom[];
  password: string;
  onLock: () => void;
}

export default function MainApp({ profiles: initialProfiles, rooms: initialRooms, password, onLock }: MainAppProps) {
  const gw = useGateway();
  const [profiles] = useState<Profile[]>(initialProfiles);
  const [rooms, setRooms] = useState<ChatRoom[]>(initialRooms);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  // Active target: agent or room
  const [activeTarget, setActiveTarget] = useState<ChatTarget>(() => {
    const savedRoom = load<string>('activeRoomId', '');
    if (savedRoom && initialRooms.some((r) => r.id === savedRoom)) {
      return { type: 'room', roomId: savedRoom };
    }
    const savedAgent = loadActiveProfileId();
    const agentId = initialProfiles.find((p) => p.id === savedAgent) ? savedAgent : initialProfiles[0]?.id ?? '';
    return { type: 'agent', profileId: agentId };
  });

  const messageCacheRef = useRef<Record<string, Message[]>>({});

  const activeProfile = activeTarget.type === 'agent'
    ? profiles.find((p) => p.id === activeTarget.profileId) ?? profiles[0]
    : null;

  const activeRoom = activeTarget.type === 'room'
    ? rooms.find((r) => r.id === activeTarget.roomId)
    : null;

  // Cache messages when they change
  useEffect(() => {
    if (activeProfile && gw.messages.length > 0) {
      messageCacheRef.current[activeProfile.id] = gw.messages;
    }
  }, [gw.messages, activeProfile]);

  // Auto-connect to active agent on mount
  useEffect(() => {
    if (activeProfile && gw.status === 'disconnected') {
      gw.connect(activeProfile.gatewayUrl, activeProfile.authToken, activeProfile.sessionKey);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const switchToAgent = useCallback(
    (profileId: string) => {
      if (activeTarget.type === 'agent' && activeTarget.profileId === profileId && gw.status === 'connected') return;
      const profile = profiles.find((p) => p.id === profileId);
      if (!profile) return;

      if (activeProfile && gw.messages.length > 0) {
        messageCacheRef.current[activeProfile.id] = gw.messages;
      }

      setActiveTarget({ type: 'agent', profileId });
      saveActiveProfileId(profileId);
      save('activeRoomId', '');

      if (gw.status === 'connected' || gw.status === 'connecting') {
        gw.disconnect();
      }
      setTimeout(() => {
        gw.connect(profile.gatewayUrl, profile.authToken, profile.sessionKey);
      }, 50);
    },
    [activeTarget, profiles, activeProfile, gw],
  );

  const switchToRoom = useCallback((roomId: string) => {
    if (activeTarget.type === 'room' && activeTarget.roomId === roomId) return;

    // Disconnect single-agent connection
    if (gw.status === 'connected' || gw.status === 'connecting') {
      gw.disconnect();
    }

    setActiveTarget({ type: 'room', roomId });
    save('activeRoomId', roomId);
  }, [activeTarget, gw]);

  const handleCreateRoom = useCallback(async (room: ChatRoom) => {
    const newRooms = [...rooms, room];
    setRooms(newRooms);
    // Persist to vault
    const vaultData: VaultData = { profiles, rooms: newRooms };
    await updateVault(password, vaultData);
    // Switch to the new room
    switchToRoom(room.id);
  }, [rooms, profiles, password, switchToRoom]);

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className={`fixed inset-0 z-40 md:relative md:z-auto ${sidebarOpen ? 'block' : 'hidden'} md:block`}>
        <div className="absolute inset-0 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />
        <div className="relative w-72 h-full z-10">
          <Sidebar
            profiles={profiles}
            rooms={rooms}
            activeTarget={activeTarget}
            onSelectAgent={(id) => { switchToAgent(id); setSidebarOpen(false); }}
            onSelectRoom={(id) => { switchToRoom(id); setSidebarOpen(false); }}
            onClose={() => setSidebarOpen(false)}
            connectionStatus={gw.status}
            onLock={onLock}
            onCreateRoom={() => setShowCreateRoom(true)}
          />
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 min-w-0">
        {activeTarget.type === 'agent' && activeProfile && (
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
        {activeTarget.type === 'room' && activeRoom && (
          <RoomInterface
            room={activeRoom}
            profiles={profiles}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}
      </div>

      {/* Create Room Modal */}
      <CreateRoomModal
        open={showCreateRoom}
        onClose={() => setShowCreateRoom(false)}
        profiles={profiles}
        onCreate={handleCreateRoom}
      />
    </div>
  );
}
