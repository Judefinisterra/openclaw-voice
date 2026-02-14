import { useState } from 'react';
import type { Profile } from '../types';

interface ProfileManagerProps {
  profile: Profile;
  onSave: (profile: Profile) => void;
  onCancel: () => void;
}

export default function ProfileManager({ profile, onSave, onCancel }: ProfileManagerProps) {
  const [form, setForm] = useState<Profile>({ ...profile });

  const update = (field: keyof Profile, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md mx-4 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">
          {profile.name === 'New Agent' ? 'Add Agent Profile' : 'Edit Profile'}
        </h2>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Profile Name</label>
          <input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-purple-500"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Gateway URL</label>
          <input
            value={form.gatewayUrl}
            onChange={(e) => update('gatewayUrl', e.target.value)}
            placeholder="wss://host:port"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-purple-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Auth Token</label>
          <input
            value={form.authToken}
            onChange={(e) => update('authToken', e.target.value)}
            type="password"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-purple-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Session Key</label>
          <input
            value={form.sessionKey}
            onChange={(e) => update('sessionKey', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-purple-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Voice URI (optional)</label>
          <input
            value={form.voiceUri}
            onChange={(e) => update('voiceUri', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onSave(form)}
            className="flex-1 bg-purple-600 hover:bg-purple-500 rounded-lg py-3 font-medium transition-colors"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-800 hover:bg-gray-700 rounded-lg py-3 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
