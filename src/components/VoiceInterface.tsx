import { useEffect, useCallback, useState, useRef } from 'react';
import Orb from './Orb';
import Transcript from './Transcript';
import Settings from './Settings';
import ToggleSwitch from './ToggleSwitch';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTTS } from '../hooks/useTTS';
import { useVAD } from '../hooks/useVAD';
import { load, save, loadListeningMode, saveListeningMode } from '../lib/storage';
import type { OrbState, Message, Settings as SettingsType } from '../types';
import type { GatewayStatus } from '../hooks/useGateway';

interface VoiceInterfaceProps {
  gatewayStatus: GatewayStatus;
  messages: Message[];
  streamingText: string;
  isProcessing: boolean;
  sendMessage: (text: string) => void;
  disconnect: () => void;
  onResponseComplete: (cb: (text: string) => void) => void;
  reconnect: (url: string, token: string, sessionKey: string) => void;
  gatewayUrl: string;
  authToken: string;
  profileName: string;
  onOpenSidebar?: () => void;
  sessionKey: string;
}

export default function VoiceInterface({
  gatewayStatus,
  messages,
  streamingText,
  isProcessing,
  sendMessage,
  disconnect,
  onResponseComplete,
  reconnect,
  gatewayUrl,
  authToken,
  profileName,
  onOpenSidebar,
  sessionKey,
}: VoiceInterfaceProps) {
  const stt = useSpeechRecognition();
  const tts = useTTS();
  const vad = useVAD();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [vadEnabled, setVadEnabled] = useState(() => loadListeningMode());
  const [settings, setSettings] = useState<SettingsType>(() =>
    load<SettingsType>('settings', { voiceUri: '', autoListen: true, sessionKey: 'main', vadEnabled: true, elevenLabsVoiceId: '' }),
  );
  const [textInput, setTextInput] = useState('');

  // Track if VAD-triggered STT is active
  const vadTriggeredRef = useRef(false);
  // Audio unlock placeholder - removed aggressive iOS workaround

  // Set voice from settings
  useEffect(() => {
    if (settings.voiceUri) tts.setVoice(settings.voiceUri);
  }, [settings.voiceUri, tts]);

  useEffect(() => {
    if (settings.elevenLabsVoiceId) tts.setElevenLabsVoice(settings.elevenLabsVoiceId);
  }, [settings.elevenLabsVoiceId, tts]);

  // When STT gets a final result, send it
  useEffect(() => {
    stt.onFinalResult((text) => {
      sendMessage(text);
      vadTriggeredRef.current = false;
    });
  }, [stt, sendMessage]);

  // When assistant response completes, speak it
  const ttsRef = useRef(tts);
  ttsRef.current = tts;
  useEffect(() => {
    onResponseComplete((text) => {
      console.log('[Voice] response complete, calling TTS, text length:', text.length);
      ttsRef.current.speak(text);
    });
  }, [onResponseComplete]);

  // Auto-listen after TTS finishes (only in non-VAD mode)
  useEffect(() => {
    tts.onSpeakEnd(() => {
      if (!vadEnabled && settings.autoListen && stt.supported) {
        setTimeout(() => stt.start(), 300);
      }
    });
  }, [tts, stt, settings.autoListen, vadEnabled]);

  // VAD toggle handler
  const handleVadToggle = useCallback((enabled: boolean) => {
    setVadEnabled(enabled);
    saveListeningMode(enabled);
    setSettings((s) => {
      const next = { ...s, vadEnabled: enabled };
      save('settings', next);
      return next;
    });
  }, []);

  // VAD: start/stop
  useEffect(() => {
    if (vadEnabled) {
      vad.start();
    } else {
      vad.stop();
    }
  }, [vadEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // VAD: wire up speech start/end
  useEffect(() => {
    vad.onSpeechStart(() => {
      if (isProcessing || tts.isSpeaking) return;
      if (stt.supported && !stt.isListening) {
        vadTriggeredRef.current = true;
        tts.cancel();
        stt.start();
      }
    });
  }, [vad, stt, tts, isProcessing]);

  useEffect(() => {
    vad.onSpeechEnd(() => {
      if (vadTriggeredRef.current && stt.isListening) {
        stt.stop();
      }
    });
  }, [vad, stt]);

  // Determine orb state
  const orbState: OrbState = stt.isListening
    ? 'listening'
    : isProcessing
      ? 'processing'
      : tts.isSpeaking
        ? 'speaking'
        : (vadEnabled && vad.isActive)
          ? 'vad-ready'
          : 'idle';

  const handleOrbClick = useCallback(() => {
    if (tts.isSpeaking) {
      tts.cancel();
      return;
    }
    if (stt.isListening) {
      stt.stop();
    } else {
      if (!stt.supported) {
        alert('Speech recognition is not supported in this browser. Try Chrome.');
        return;
      }
      stt.start();
    }
  }, [stt, tts]);

  // Spacebar push-to-talk
  const spaceHeldRef = useRef(false);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !spaceHeldRef.current) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        spaceHeldRef.current = true;
        if (tts.isSpeaking) tts.cancel();
        if (stt.supported && !stt.isListening) stt.start();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && spaceHeldRef.current) {
        e.preventDefault();
        spaceHeldRef.current = false;
        if (stt.isListening) stt.stop();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [stt, tts]);

  const handleTextSend = () => {
    const text = textInput.trim();
    if (!text) return;
    sendMessage(text);
    setTextInput('');
  };

  const statusDot = gatewayStatus === 'connected' ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gray-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          {onOpenSidebar && (
            <button
              onClick={onOpenSidebar}
              className="md:hidden text-gray-400 hover:text-white p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <div className={`w-2 h-2 rounded-full ${statusDot}`} />
          <span className="text-sm text-gray-300 font-medium">{profileName}</span>
          <span className="text-xs text-gray-600">#{sessionKey}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-gray-500 hover:text-white transition-colors p-1.5"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={disconnect}
            className="text-gray-500 hover:text-red-400 transition-colors text-xs"
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Orb + Toggle area */}
      <div className="flex flex-col items-center py-6 flex-shrink-0">
        <Orb
          state={orbState}
          onClick={handleOrbClick}
          onHoldStart={() => {
            if (tts.isSpeaking) tts.cancel();
            if (stt.supported && !stt.isListening) stt.start();
          }}
          onHoldEnd={() => {
            if (stt.isListening) stt.stop();
          }}
          transcript={stt.isListening ? stt.transcript : undefined}
          vadActive={vadEnabled && vad.isActive}
        />

        {/* VAD Toggle - prominent, right below the orb */}
        <div className="mt-4">
          <ToggleSwitch
            enabled={vadEnabled}
            onChange={handleVadToggle}
            label={vadEnabled ? 'Hands-free ON' : 'Hands-free OFF'}
            sublabel={vadEnabled ? 'Listening continuously' : 'Push-to-talk mode'}
          />
        </div>

        {stt.error && <p className="mt-2 text-red-400 text-xs">{stt.error}</p>}
      </div>

      {/* Chat transcript - scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <Transcript messages={messages} streamingText={streamingText} />
      </div>

      {/* Text input bar */}
      <div className="flex-shrink-0 border-t border-white/10 bg-gray-900/80 backdrop-blur-sm px-4 py-3">
        <div className="flex gap-2">
          <input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleTextSend(); }}
            placeholder="Type a message..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            onClick={handleTextSend}
            disabled={!textInput.trim()}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-30 rounded-full w-10 h-10 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Settings panel */}
      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        browserVoices={tts.browserVoices}
        onVoiceChange={tts.setVoice}
        onSettingsChange={(s) => {
          setSettings(s);
          setVadEnabled(s.vadEnabled);
          saveListeningMode(s.vadEnabled);
        }}
        gatewayUrl={gatewayUrl}
        authToken={authToken}
        onReconnect={reconnect}
        profileName={profileName}
        elevenVoices={tts.elevenVoices}
        elevenLoading={tts.elevenLoading}
        fetchElevenVoices={tts.fetchElevenVoices}
        onElevenVoiceChange={tts.setElevenLabsVoice}
      />
    </div>
  );
}
