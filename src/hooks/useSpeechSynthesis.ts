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
    if (!text.trim()) return;
    
    speechSynthesis.cancel();
    
    // Clean markdown for speech
    const cleaned = text
      .replace(/```[\s\S]*?```/g, ' code block omitted ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .slice(0, 4000)
      .trim();
    
    if (!cleaned) return;

    const utt = new SpeechSynthesisUtterance(cleaned);
    if (voiceUriRef.current) {
      const v = speechSynthesis.getVoices().find((v) => v.voiceURI === voiceUriRef.current);
      if (v) utt.voice = v;
    }
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => {
      setIsSpeaking(false);
      onEndRef.current?.();
    };
    utt.onerror = () => setIsSpeaking(false);
    speechSynthesis.speak(utt);
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
