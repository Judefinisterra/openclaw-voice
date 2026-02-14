import { useState, useCallback } from 'react';
import ConnectScreen from './components/ConnectScreen';
import VoiceInterface from './components/VoiceInterface';
import { useGateway } from './hooks/useGateway';

export default function App() {
  const gw = useGateway();
  const [connInfo, setConnInfo] = useState({ url: '', token: '' });

  const handleConnect = useCallback(
    (url: string, token: string, sessionKey: string) => {
      setConnInfo({ url, token });
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
      />
    );
  }

  return <ConnectScreen onConnect={handleConnect} status={gw.status} error={gw.error} />;
}
