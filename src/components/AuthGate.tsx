import { useState, useEffect, useCallback, useRef } from 'react';
import type { Profile, ChatRoom, VaultData } from '../types';
import {
  hasVault,
  createVault,
  unlockVault,
  checkRateLimit,
  recordFailure,
  clearRateLimit,
  touchActivity,
  isSessionExpired,
} from '../lib/crypto';

interface AuthGateProps {
  children: (props: { profiles: Profile[]; rooms: ChatRoom[]; password: string; onLock: () => void }) => React.ReactNode;
}

type Screen = 'loading' | 'setup' | 'login' | 'locked';

// Template profiles for first-time setup
// Simple ID generator
function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function AuthGate({ children }: AuthGateProps) {
  const [screen, setScreen] = useState<Screen>('loading');
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [lockCountdown, setLockCountdown] = useState(0);
  const activityTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Check initial state
  useEffect(() => {
    if (hasVault()) {
      if (isSessionExpired()) {
        setScreen('login');
      } else {
        setScreen('login');
      }
    } else {
      setScreen('setup');
    }
  }, []);

  // Activity tracking for session timeout
  useEffect(() => {
    if (!profiles) return;
    
    const handler = () => touchActivity();
    window.addEventListener('click', handler);
    window.addEventListener('keydown', handler);
    window.addEventListener('touchstart', handler);
    touchActivity();

    activityTimerRef.current = setInterval(() => {
      if (isSessionExpired()) {
        setProfiles(null);
        setRooms([]);
        setPassword('');
        setScreen('login');
      }
    }, 60_000); // check every minute

    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('keydown', handler);
      window.removeEventListener('touchstart', handler);
      clearInterval(activityTimerRef.current);
    };
  }, [profiles]);

  // Rate limit countdown
  useEffect(() => {
    if (lockCountdown <= 0) return;
    const t = setInterval(() => {
      const rl = checkRateLimit();
      if (rl.allowed) {
        setLockCountdown(0);
        setError('');
      } else {
        setLockCountdown(Math.ceil(rl.remainingMs / 1000));
      }
    }, 1000);
    return () => clearInterval(t);
  }, [lockCountdown]);

  const handleLock = useCallback(() => {
    setProfiles(null);
    setRooms([]);
    setPassword('');
    setScreen('login');
  }, []);

  if (screen === 'loading') {
    return <LoadingScreen />;
  }

  if (screen === 'setup') {
    return (
      <SetupScreen
        onComplete={async (pw, newProfiles) => {
          const vaultData: VaultData = { profiles: newProfiles, rooms: [] };
          await createVault(pw, vaultData);
          clearRateLimit();
          touchActivity();
          setPassword(pw);
          setProfiles(newProfiles);
          setRooms([]);
          setScreen('login'); // triggers re-render into main app
        }}
      />
    );
  }

  if (screen === 'login' && !profiles) {
    return (
      <LoginScreen
        error={error}
        lockCountdown={lockCountdown}
        onLogin={async (pw) => {
          const rl = checkRateLimit();
          if (!rl.allowed) {
            setLockCountdown(Math.ceil(rl.remainingMs / 1000));
            setError(`Too many attempts. Locked for ${Math.ceil(rl.remainingMs / 1000)}s`);
            return;
          }
          try {
            const raw = await unlockVault(pw);
            // Support old format (plain array of profiles) and new VaultData format
            let vaultData: VaultData;
            if (Array.isArray(raw)) {
              vaultData = { profiles: raw as Profile[], rooms: [] };
            } else {
              vaultData = raw as VaultData;
            }
            clearRateLimit();
            touchActivity();
            setPassword(pw);
            setProfiles(vaultData.profiles);
            setRooms(vaultData.rooms || []);
            setError('');
          } catch {
            const result = recordFailure();
            if (result.locked) {
              setLockCountdown(Math.ceil(result.remainingMs / 1000));
              setError('Too many failed attempts. Locked for 5 minutes.');
            } else {
              setError('Wrong password');
            }
          }
        }}
        onReset={() => {
          if (confirm('This will erase all saved agent configurations. Continue?')) {
            localStorage.clear();
            setScreen('setup');
            setError('');
          }
        }}
      />
    );
  }

  if (profiles) {
    return <>{children({ profiles, rooms, password, onLock: handleLock })}</>;
  }

  return <LoadingScreen />;
}

// --- Sub-screens ---

function LoadingScreen() {
  return (
    <div className="h-full flex items-center justify-center bg-gray-950">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function LoginScreen({
  error,
  lockCountdown,
  onLogin,
  onReset,
}: {
  error: string;
  lockCountdown: number;
  onLogin: (pw: string) => void;
  onReset: () => void;
}) {
  const [pw, setPw] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const locked = lockCountdown > 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw.trim() || locked) return;
    onLogin(pw);
  };

  return (
    <div className="h-full flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white">OpenClaw Voice</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your password to unlock</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Master password"
            disabled={locked}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors disabled:opacity-50"
            autoComplete="current-password"
          />

          {error && (
            <p className="text-red-400 text-xs text-center">{error}</p>
          )}

          {locked && (
            <p className="text-yellow-400 text-xs text-center">
              Locked for {lockCountdown}s
            </p>
          )}

          <button
            type="submit"
            disabled={!pw.trim() || locked}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:hover:bg-purple-600 text-white rounded-xl py-3 text-sm font-medium transition-colors"
          >
            Unlock
          </button>
        </form>

        <button
          onClick={onReset}
          className="w-full mt-6 text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          Reset everything & start over
        </button>
      </div>
    </div>
  );
}

function SetupScreen({
  onComplete,
}: {
  onComplete: (password: string, profiles: Profile[]) => void | Promise<void>;
}) {
  const [step, setStep] = useState<'password' | 'agents'>('password');
  const [pw, setPw] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [agents, setAgents] = useState<Profile[]>([
    { id: makeId(), name: '', gatewayUrl: '', authToken: '', sessionKey: 'main', voiceUri: '', role: '' },
  ]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 4) {
      setPwError('Password must be at least 4 characters');
      return;
    }
    if (pw !== pwConfirm) {
      setPwError('Passwords don\'t match');
      return;
    }
    setPwError('');
    setStep('agents');
  };

  const handleAgentChange = (index: number, field: keyof Profile, value: string) => {
    setAgents((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value } : a))
    );
  };

  const addAgent = () => {
    setAgents((prev) => [
      ...prev,
      { id: makeId(), name: '', gatewayUrl: '', authToken: '', sessionKey: 'main', voiceUri: '', role: '' },
    ]);
  };

  const removeAgent = (index: number) => {
    if (agents.length <= 1) return;
    setAgents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFinish = () => {
    const valid = agents.filter((a) => a.name.trim() && a.gatewayUrl.trim() && a.authToken.trim());
    if (valid.length === 0) return;
    onComplete(pw, valid);
  };

  if (step === 'password') {
    return (
      <div className="h-full flex items-center justify-center bg-gray-950 px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-white">Welcome to OpenClaw Voice</h1>
            <p className="text-sm text-gray-500 mt-1">Set a master password to protect your agent tokens</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Choose a password"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                autoComplete="new-password"
                autoFocus
              />
            </div>
            <div>
              <input
                type="password"
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                placeholder="Confirm password"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                autoComplete="new-password"
              />
            </div>

            {pwError && <p className="text-red-400 text-xs text-center">{pwError}</p>}

            <button
              type="submit"
              disabled={!pw || !pwConfirm}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white rounded-xl py-3 text-sm font-medium transition-colors"
            >
              Continue →
            </button>
          </form>

          <p className="text-[11px] text-gray-600 text-center mt-6">
            Your password encrypts all agent tokens locally using AES-256-GCM.
            <br />Nothing is sent to any server.
          </p>
        </div>
      </div>
    );
  }

  // Agent setup step
  return (
    <div className="h-full flex flex-col bg-gray-950">
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <h1 className="text-lg font-semibold text-white">Configure Your Agents</h1>
        <p className="text-sm text-gray-500">Add at least one agent gateway connection</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {agents.map((agent, i) => (
          <div key={agent.id} className="bg-gray-900 rounded-xl p-4 space-y-3 border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">Agent {i + 1}</span>
              {agents.length > 1 && (
                <button onClick={() => removeAgent(i)} className="text-gray-600 hover:text-red-400 text-xs">
                  Remove
                </button>
              )}
            </div>
            <input
              value={agent.name}
              onChange={(e) => handleAgentChange(i, 'name', e.target.value)}
              placeholder="Agent name (e.g. BrianClaw)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <input
              value={agent.gatewayUrl}
              onChange={(e) => handleAgentChange(i, 'gatewayUrl', e.target.value)}
              placeholder="Gateway URL (wss://...)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <input
              value={agent.authToken}
              onChange={(e) => handleAgentChange(i, 'authToken', e.target.value)}
              placeholder="Auth token"
              type="password"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <input
              value={agent.role || ''}
              onChange={(e) => handleAgentChange(i, 'role', e.target.value)}
              placeholder="Role (optional, e.g. CTO)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
        ))}

        <button
          onClick={addAgent}
          className="w-full border border-dashed border-gray-700 rounded-xl py-3 text-sm text-gray-500 hover:text-gray-300 hover:border-gray-500 transition-colors"
        >
          + Add Another Agent
        </button>
      </div>

      <div className="flex-shrink-0 p-4 border-t border-white/10">
        <button
          onClick={handleFinish}
          disabled={!agents.some((a) => a.name.trim() && a.gatewayUrl.trim() && a.authToken.trim())}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white rounded-xl py-3 text-sm font-medium transition-colors"
        >
          Encrypt & Save
        </button>
      </div>
    </div>
  );
}
