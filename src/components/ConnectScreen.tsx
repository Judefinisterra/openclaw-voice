import { useState } from 'react';
import { loadProfiles, saveProfiles, loadActiveProfileId, saveActiveProfileId } from '../lib/storage';
import type { Profile } from '../types';

interface ConnectScreenProps {
  onConnect: (url: string, token: string, sessionKey: string) => void;
  status: string;
  error: string | null;
}

function generateId() {
  return Math.random().toString(36).slice(2, 8);
}

export default function ConnectScreen({ onConnect, status, error }: ConnectScreenProps) {
  const [profiles, setProfiles] = useState<Profile[]>(loadProfiles);
  const [activeId, setActiveId] = useState(loadActiveProfileId);
  const [editing, setEditing] = useState(false);
  const [editProfile, setEditProfile] = useState<Profile | null>(null);

  const active = profiles.find((p) => p.id === activeId) ?? profiles[0];

  const handleConnect = () => {
    if (!active) return;
    saveActiveProfileId(active.id);
    onConnect(active.gatewayUrl, active.authToken, active.sessionKey);
  };

  const handleSaveProfile = () => {
    if (!editProfile) return;
    const updated = profiles.some((p) => p.id === editProfile.id)
      ? profiles.map((p) => (p.id === editProfile.id ? editProfile : p))
      : [...profiles, editProfile];
    setProfiles(updated);
    saveProfiles(updated);
    setActiveId(editProfile.id);
    saveActiveProfileId(editProfile.id);
    setEditing(false);
    setEditProfile(null);
  };

  const handleDeleteProfile = (id: string) => {
    const updated = profiles.filter((p) => p.id !== id);
    if (updated.length === 0) return; // keep at least one
    setProfiles(updated);
    saveProfiles(updated);
    if (activeId === id) {
      setActiveId(updated[0].id);
      saveActiveProfileId(updated[0].id);
    }
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
          <p className="text-gray-400 text-sm mt-1">Select a profile and connect</p>
        </div>

        {!editing ? (
          <div className="space-y-4">
            {/* Profile selector */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Profile</label>
              <select
                value={activeId}
                onChange={(e) => {
                  setActiveId(e.target.value);
                  saveActiveProfileId(e.target.value);
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.gatewayUrl}
                  </option>
                ))}
              </select>
            </div>

            {active && (
              <div className="text-xs text-gray-500 space-y-1">
                <p>URL: {active.gatewayUrl}</p>
                <p>Session: {active.sessionKey}</p>
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={status === 'connecting' || !active}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg py-3 font-medium transition-colors"
            >
              {status === 'connecting' ? 'Connecting...' : `Connect to ${active?.name ?? 'agent'}`}
            </button>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => { setEditProfile(active ? { ...active } : null); setEditing(true); }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 rounded-lg py-2 text-sm transition-colors"
              >
                Edit Profile
              </button>
              <button
                onClick={() => {
                  setEditProfile({
                    id: generateId(),
                    name: 'New Agent',
                    gatewayUrl: 'wss://particularly-fuji-fashion-delivered.trycloudflare.com',
                    authToken: '',
                    sessionKey: 'main',
                    voiceUri: '',
                  });
                  setEditing(true);
                }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 rounded-lg py-2 text-sm transition-colors"
              >
                + New Profile
              </button>
            </div>

            {profiles.length > 1 && (
              <button
                onClick={() => handleDeleteProfile(activeId)}
                className="w-full text-red-400 hover:text-red-300 text-xs py-1"
              >
                Delete "{active?.name}"
              </button>
            )}
          </div>
        ) : editProfile ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Profile Name</label>
              <input
                value={editProfile.name}
                onChange={(e) => setEditProfile({ ...editProfile, name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Gateway URL</label>
              <input
                value={editProfile.gatewayUrl}
                onChange={(e) => setEditProfile({ ...editProfile, gatewayUrl: e.target.value })}
                placeholder="wss://host:port"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Auth Token</label>
              <input
                value={editProfile.authToken}
                onChange={(e) => setEditProfile({ ...editProfile, authToken: e.target.value })}
                type="password"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Session Key</label>
              <input
                value={editProfile.sessionKey}
                onChange={(e) => setEditProfile({ ...editProfile, sessionKey: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveProfile}
                className="flex-1 bg-blue-600 hover:bg-blue-500 rounded-lg py-3 font-medium transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => { setEditing(false); setEditProfile(null); }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 rounded-lg py-3 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
