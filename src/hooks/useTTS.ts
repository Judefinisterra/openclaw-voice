import { useCallback, useEffect, useRef } from 'react';
import { useSpeechSynthesis } from './useSpeechSynthesis';
import { useElevenLabs } from './useElevenLabs';

/**
 * Unified TTS hook: uses ElevenLabs when configured, falls back to browser TTS.
 */
export function useTTS() {
  const browser = useSpeechSynthesis();
  const eleven = useElevenLabs();
  const onEndRef = useRef<(() => void) | null>(null);

  const isSpeaking = eleven.isSpeaking || browser.isSpeaking;

  // Forward end callbacks
  useEffect(() => {
    browser.onSpeakEnd(() => onEndRef.current?.());
  }, [browser]);

  useEffect(() => {
    eleven.onSpeakEnd(() => onEndRef.current?.());
  }, [eleven]);

  const speak = useCallback(async (text: string) => {
    if (eleven.isConfigured()) {
      const ok = await eleven.speak(text);
      if (ok) return;
    }
    // Fallback to browser TTS
    browser.speak(text);
  }, [eleven, browser]);

  const cancel = useCallback(() => {
    eleven.cancel();
    browser.cancel();
  }, [eleven, browser]);

  const setVoice = useCallback((uri: string) => {
    browser.setVoice(uri);
  }, [browser]);

  const setElevenLabsVoice = useCallback((voiceId: string) => {
    eleven.setVoice(voiceId);
  }, [eleven]);

  const onSpeakEnd = useCallback((cb: () => void) => {
    onEndRef.current = cb;
  }, []);

  return {
    isSpeaking,
    speak,
    cancel,
    setVoice,
    setElevenLabsVoice,
    onSpeakEnd,
    // Browser voices for settings
    browserVoices: browser.voices,
    // ElevenLabs
    elevenVoices: eleven.voices,
    elevenLoading: eleven.loading,
    fetchElevenVoices: eleven.fetchVoices,
    isElevenConfigured: eleven.isConfigured,
  };
}
