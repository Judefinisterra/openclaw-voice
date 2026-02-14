import { useState, useEffect } from 'react';
import { load, save } from '../lib/storage';
import type { Settings as SettingsType } from '../types';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  voices: SpeechSynthesisVoice[];
  onVoiceChange: (uri: string) => void;
  onSettingsChange: (s: SettingsType) => void;
  gatewayUrl: string;
  authToken: string;
  onReconnect: (url: string, token: string, sessionKey: string) => void;
}

export default function Settings({
  open,
  onClose,
  voices,
  onVoiceChange,
  onSettingsChange,
  gatewayUrl,
  authToken,
  onReconnect,
}: SettingsProps) {
  const [settings, setSettings] = useState<SettingsType>(() =>
    load<SettingsType>('settings', { voiceUri: '', autoListen: true, sessionKey: 'main' }),
  );
  const [url, setUrl] = useState(gatewayUrl);
  const [token, setToken] = useState(authToken);

  useEffect(() => {
    setUrl(gatewayUrl);
    setToken(authToken);
  }, [gatewayUrl, authToken]);

  const update = (patch: Partial<SettingsType>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    save('settings', next);
    onSettingsChange(next);
    if (patch.voiceUri !== undefined) onVoiceChange(patch.voiceUri);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-80 bg-gray-900 h-full p-6 overflow-y-auto border-l border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Gateway URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Auth Token</label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              type="password"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Session Key</label>
            <input
              value={settings.sessionKey}
              onChange={(e) => update({ sessionKey: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>

          <button
            onClick={() => {
              save('connection', { gatewayUrl: url, authToken: token });
              onReconnect(url, token, settings.sessionKey);
              onClose();
            }}
            className="w-full bg-blue-600 hover:bg-blue-500 rounded py-2 text-sm font-medium"
          >
            Reconnect
          </button>

          <div>
            <label className="block text-xs text-gray-400 mb-1">TTS Voice</label>
            <select
              value={settings.voiceUri}
              onChange={(e) => update({ voiceUri: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            >
              <option value="">Default</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.autoListen}
              onChange={(e) => update({ autoListen: e.target.checked })}
              className="rounded"
            />
            Auto-listen after response
          </label>
        </div>
      </div>
    </div>
  );
}
