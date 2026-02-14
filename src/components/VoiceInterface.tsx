import { useEffect, useCallback, useState, useRef } from 'react';
import Orb from './Orb';
import Transcript from './Transcript';
import Settings from './Settings';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { load } from '../lib/storage';
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
}: VoiceInterfaceProps) {
  const stt = useSpeechRecognition();
  const tts = useSpeechSynthesis();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<SettingsType>(() =>
    load<SettingsType>('settings', { voiceUri: '', autoListen: true, sessionKey: 'main' }),
  );

  // Set voice from settings
  useEffect(() => {
    if (settings.voiceUri) tts.setVoice(settings.voiceUri);
  }, [settings.voiceUri, tts]);

  // When STT gets a final result, send it
  useEffect(() => {
    stt.onFinalResult((text) => {
      sendMessage(text);
    });
  }, [stt, sendMessage]);

  // When assistant response completes, speak it
  useEffect(() => {
    onResponseComplete((text) => {
      tts.speak(text);
    });
  }, [onResponseComplete, tts]);

  // Auto-listen after TTS finishes
  useEffect(() => {
    tts.onSpeakEnd(() => {
      if (settings.autoListen && stt.supported) {
        setTimeout(() => stt.start(), 300);
      }
    });
  }, [tts, stt, settings.autoListen]);

  const orbState: OrbState = stt.isListening
    ? 'listening'
    : isProcessing
      ? 'processing'
      : tts.isSpeaking
        ? 'speaking'
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
        // Ignore if user is typing in an input
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

  const statusDot = gatewayStatus === 'connected' ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className="h-full flex flex-col items-center justify-center relative">
      {/* Top bar */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${statusDot}`} />
        <span className="text-xs text-gray-500">{gatewayStatus}</span>
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={() => setSettingsOpen(true)}
          className="text-gray-500 hover:text-white transition-colors p-2"
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

      {/* Orb */}
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
      />

      {/* Streaming text */}
      {streamingText && !tts.isSpeaking && (
        <p className="mt-6 text-gray-300 text-sm max-w-md text-center px-4 line-clamp-3">
          {streamingText}
        </p>
      )}

      {/* Transcript */}
      <Transcript messages={messages} streamingText={streamingText} />

      {/* Settings */}
      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        voices={tts.voices}
        onVoiceChange={tts.setVoice}
        onSettingsChange={setSettings}
        gatewayUrl={gatewayUrl}
        authToken={authToken}
        onReconnect={reconnect}
      />
    </div>
  );
}
