import { useState, useCallback } from 'react';
import ConnectScreen from './components/ConnectScreen';
import VoiceInterface from './components/VoiceInterface';
import Sidebar from './components/Sidebar';
import { useGateway } from './hooks/useGateway';
import { loadProfiles, loadActiveProfileId } from './lib/storage';

export default function App() {
  const gw = useGateway();
  const [connInfo, setConnInfo] = useState({ url: '', token: '', profileName: '' });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSessionKey, setActiveSessionKey] = useState('main');

  const handleConnect = useCallback(
    (url: string, token: string, sessionKey: string) => {
      const profiles = loadProfiles();
      const activeId = loadActiveProfileId();
      const profile = profiles.find((p) => p.id === activeId);
      setConnInfo({ url, token, profileName: profile?.name ?? 'Agent' });
      setActiveSessionKey(sessionKey);
      gw.connect(url, token, sessionKey);
    },
    [gw],
  );

  const handleSelectSession = useCallback(
    (key: string) => {
      setActiveSessionKey(key);
      gw.switchSession(key);
    },
    [gw],
  );

  if (gw.status === 'connected') {
    return (
      <div className="h-full flex">
        {/* Sidebar - desktop: always visible, mobile: overlay */}
        <div
          className={`
            fixed inset-0 z-40 md:relative md:z-auto
            ${sidebarOpen ? 'block' : 'hidden'} md:block
          `}
        >
          {/* Mobile backdrop */}
          <div
            className="absolute inset-0 bg-black/60 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-72 h-full z-10">
            <Sidebar
              sessions={gw.sessions}
              activeSessionKey={activeSessionKey}
              onSelectSession={handleSelectSession}
              onNewSession={() => {
                const key = `session-${Date.now()}`;
                handleSelectSession(key);
              }}
              onClose={() => setSidebarOpen(false)}
              profileName={connInfo.profileName}
            />
          </div>
        </div>

        {/* Main panel */}
        <div className="flex-1 min-w-0">
          <VoiceInterface
            gatewayStatus={gw.status}
            messages={gw.messages}
            streamingText={gw.streamingText}
            isProcessing={gw.isProcessing}
            sendMessage={gw.sendMessage}
            disconnect={gw.disconnect}
            onResponseComplete={gw.onResponseComplete}
            reconnect={handleConnect}
            gatewayUrl={connInfo.url}
            authToken={connInfo.token}
            profileName={connInfo.profileName}
            onOpenSidebar={() => setSidebarOpen(true)}
            sessionKey={activeSessionKey}
          />
        </div>
      </div>
    );
  }

  return <ConnectScreen onConnect={handleConnect} status={gw.status} error={gw.error} />;
}
