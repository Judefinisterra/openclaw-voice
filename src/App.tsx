import { useState, useCallback } from 'react';
import ConnectScreen from './components/ConnectScreen';
import VoiceInterface from './components/VoiceInterface';
import { useGateway } from './hooks/useGateway';
import { loadProfiles, loadActiveProfileId } from './lib/storage';

export default function App() {
  const gw = useGateway();
  const [connInfo, setConnInfo] = useState({ url: '', token: '', profileName: '' });

  const handleConnect = useCallback(
    (url: string, token: string, sessionKey: string) => {
      // Find profile name
      const profiles = loadProfiles();
      const activeId = loadActiveProfileId();
      const profile = profiles.find((p) => p.id === activeId);
      setConnInfo({ url, token, profileName: profile?.name ?? 'Agent' });
      gw.connect(url, token, sessionKey);
    },
    [gw],
  );

  if (gw.status === 'connected') {
    return (
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
      />
    );
  }

  return <ConnectScreen onConnect={handleConnect} status={gw.status} error={gw.error} />;
}
