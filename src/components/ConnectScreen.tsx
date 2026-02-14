import { useState } from 'react';
import { load, save } from '../lib/storage';
import type { ConnectionConfig } from '../types';

interface ConnectScreenProps {
  onConnect: (url: string, token: string, sessionKey: string) => void;
  status: string;
  error: string | null;
}

export default function ConnectScreen({ onConnect, status, error }: ConnectScreenProps) {
  const saved = load<Partial<ConnectionConfig>>('connection', {});
  const [url, setUrl] = useState(saved.gatewayUrl ?? 'ws://localhost:19010');
  const [token, setToken] = useState(saved.authToken ?? '');

  const handleConnect = () => {
    save('connection', { gatewayUrl: url, authToken: token });
    onConnect(url, token, 'main');
  };

  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6 px-6">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">OpenClaw Voice</h1>
          <p className="text-gray-400 text-sm mt-1">Connect to your gateway</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Gateway URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="ws://localhost:4800"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Auth Token</label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              type="password"
              placeholder="Enter your token"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleConnect}
            disabled={status === 'connecting'}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg py-3 font-medium transition-colors"
          >
            {status === 'connecting' ? 'Connecting...' : 'Connect'}
          </button>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        </div>
      </div>
    </div>
  );
}
