import { useCallback, useEffect, useRef, useState } from 'react';

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const voiceUriRef = useRef('');
  const onEndRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const load = () => setVoices(speechSynthesis.getVoices());
    load();
    speechSynthesis.addEventListener('voiceschanged', load);
    return () => speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const speak = useCallback((text: string) => {
    // iOS Safari workaround: cancel and resume to ensure synthesis is active
    speechSynthesis.cancel();
    
    // Truncate very long text to avoid iOS cutting off
    const maxLen = 4000;
    const trimmed = text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
    
    const utt = new SpeechSynthesisUtterance(trimmed);
    if (voiceUriRef.current) {
      const v = speechSynthesis.getVoices().find((v) => v.voiceURI === voiceUriRef.current);
      if (v) utt.voice = v;
    }
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => {
      setIsSpeaking(false);
      onEndRef.current?.();
    };
    utt.onerror = (e) => {
      // Don't treat 'interrupted' or 'canceled' as real errors
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('TTS error:', e.error);
      }
      setIsSpeaking(false);
    };
    speechSynthesis.speak(utt);
    
    // iOS Safari bug: synthesis can pause silently. Resume periodically.
    const resumeInterval = setInterval(() => {
      if (!speechSynthesis.speaking) {
        clearInterval(resumeInterval);
        return;
      }
      speechSynthesis.pause();
      speechSynthesis.resume();
    }, 5000);
    utt.onend = () => {
      clearInterval(resumeInterval);
      setIsSpeaking(false);
      onEndRef.current?.();
    };
  }, []);

  const cancel = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const setVoice = useCallback((uri: string) => {
    voiceUriRef.current = uri;
  }, []);

  const onSpeakEnd = useCallback((cb: () => void) => {
    onEndRef.current = cb;
  }, []);

  return { isSpeaking, voices, speak, cancel, setVoice, onSpeakEnd };
}
