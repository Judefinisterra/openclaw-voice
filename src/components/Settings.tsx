import { useState, useEffect } from 'react';
import { load, save, loadProfiles, saveProfiles, loadActiveProfileId, loadElevenLabsKey, saveElevenLabsKey } from '../lib/storage';
import type { Settings as SettingsType } from '../types';
import type { ElevenLabsVoice } from '../hooks/useElevenLabs';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  browserVoices: SpeechSynthesisVoice[];
  onVoiceChange: (uri: string) => void;
  onSettingsChange: (s: SettingsType) => void;
  gatewayUrl: string;
  authToken: string;
  onReconnect: (url: string, token: string, sessionKey: string) => void;
  profileName: string;
  elevenVoices: ElevenLabsVoice[];
  elevenLoading: boolean;
  fetchElevenVoices: () => Promise<void>;
  onElevenVoiceChange: (voiceId: string) => void;
}

export default function Settings({
  open,
  onClose,
  browserVoices,
  onVoiceChange,
  onSettingsChange,
  gatewayUrl,
  authToken,
  onReconnect,
  profileName,
  elevenVoices,
  elevenLoading,
  fetchElevenVoices,
  onElevenVoiceChange,
}: SettingsProps) {
  const [settings, setSettings] = useState<SettingsType>(() =>
    load<SettingsType>('settings', { voiceUri: '', autoListen: true, sessionKey: 'main', vadEnabled: true, elevenLabsVoiceId: '' }),
  );
  const [url, setUrl] = useState(gatewayUrl);
  const [token, setToken] = useState(authToken);
  const [elevenKey, setElevenKey] = useState(() => loadElevenLabsKey());
  const [elevenKeySaved, setElevenKeySaved] = useState(false);

  useEffect(() => {
    setUrl(gatewayUrl);
    setToken(authToken);
  }, [gatewayUrl, authToken]);

  useEffect(() => {
    if (open && profileName) {
      const profiles = loadProfiles();
      const profile = profiles.find((p) => p.name === profileName);
      if (profile?.voiceUri) {
        setSettings((s) => ({ ...s, voiceUri: profile.voiceUri }));
      }
      if (profile?.elevenLabsVoiceId) {
        setSettings((s) => ({ ...s, elevenLabsVoiceId: profile.elevenLabsVoiceId! }));
      }
    }
  }, [open, profileName]);

  // Auto-fetch ElevenLabs voices when opened with key configured
  useEffect(() => {
    if (open && loadElevenLabsKey() && elevenVoices.length === 0) {
      fetchElevenVoices();
    }
  }, [open, fetchElevenVoices, elevenVoices.length]);

  const update = (patch: Partial<SettingsType>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    save('settings', next);
    onSettingsChange(next);

    if (patch.voiceUri !== undefined) {
      onVoiceChange(patch.voiceUri);
      const profiles = loadProfiles();
      const activeId = loadActiveProfileId();
      const updated = profiles.map((p) =>
        p.id === activeId ? { ...p, voiceUri: patch.voiceUri! } : p,
      );
      saveProfiles(updated);
    }

    if (patch.elevenLabsVoiceId !== undefined) {
      onElevenVoiceChange(patch.elevenLabsVoiceId);
      const profiles = loadProfiles();
      const activeId = loadActiveProfileId();
      const updated = profiles.map((p) =>
        p.id === activeId ? { ...p, elevenLabsVoiceId: patch.elevenLabsVoiceId! } : p,
      );
      saveProfiles(updated);
    }
  };

  const handleSaveElevenKey = () => {
    saveElevenLabsKey(elevenKey);
    setElevenKeySaved(true);
    setTimeout(() => setElevenKeySaved(false), 2000);
    if (elevenKey) fetchElevenVoices();
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
          <div className="text-xs text-gray-500 bg-gray-800 rounded px-3 py-2">
            Profile: <span className="text-gray-300">{profileName}</span>
          </div>

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

          <hr className="border-white/10" />

          {/* ElevenLabs TTS Section */}
          <div>
            <h3 className="text-sm font-semibold text-purple-400 mb-2">🔊 ElevenLabs TTS</h3>
            <label className="block text-xs text-gray-400 mb-1">API Key</label>
            <div className="flex gap-2">
              <input
                value={elevenKey}
                onChange={(e) => setElevenKey(e.target.value)}
                type="password"
                placeholder="xi-..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
              />
              <button
                onClick={handleSaveElevenKey}
                className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                  elevenKeySaved ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {elevenKeySaved ? '✓' : 'Save'}
              </button>
            </div>
            <p className="text-[10px] text-gray-600 mt-1">Stored locally. Only sent to ElevenLabs API.</p>
          </div>

          {elevenKey && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                ElevenLabs Voice <span className="text-purple-400">(per profile)</span>
              </label>
              {elevenLoading ? (
                <p className="text-xs text-gray-500">Loading voices...</p>
              ) : (
                <select
                  value={settings.elevenLabsVoiceId}
                  onChange={(e) => update({ elevenLabsVoiceId: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                >
                  <option value="">Use browser TTS</option>
                  {elevenVoices.map((v) => (
                    <option key={v.voice_id} value={v.voice_id}>
                      {v.name} {v.category ? `(${v.category})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <hr className="border-white/10" />

          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Browser TTS Voice <span className="text-gray-600">(fallback)</span>
            </label>
            <select
              value={settings.voiceUri}
              onChange={(e) => update({ voiceUri: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            >
              <option value="">Default</option>
              {browserVoices.map((v) => (
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

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.vadEnabled}
              onChange={(e) => update({ vadEnabled: e.target.checked })}
              className="rounded"
            />
            <span>
              Hands-free (VAD)
              <span className="text-purple-400 text-xs ml-1">✦</span>
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
