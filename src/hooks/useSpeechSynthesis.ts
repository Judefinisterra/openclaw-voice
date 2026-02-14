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
    console.log('[TTS] speak called, text length:', text.length);
    
    // iOS Safari workaround: cancel and resume to ensure synthesis is active
    speechSynthesis.cancel();
    
    // Truncate very long text to avoid iOS cutting off
    const maxLen = 4000;
    const trimmed = text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
    
    // Strip markdown/code that sounds bad when spoken
    const cleaned = trimmed
      .replace(/```[\s\S]*?```/g, ' code block omitted ')
      .replace(/`[^`]+`/g, (m) => m.slice(1, -1))
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .trim();
    
    if (!cleaned) {
      console.log('[TTS] nothing to speak after cleaning');
      return;
    }
    
    const utt = new SpeechSynthesisUtterance(cleaned);
    if (voiceUriRef.current) {
      const v = speechSynthesis.getVoices().find((v) => v.voiceURI === voiceUriRef.current);
      if (v) utt.voice = v;
    }
    
    let resumeInterval: ReturnType<typeof setInterval> | null = null;
    
    utt.onstart = () => {
      console.log('[TTS] speech started');
      setIsSpeaking(true);
    };
    utt.onend = () => {
      console.log('[TTS] speech ended');
      if (resumeInterval) clearInterval(resumeInterval);
      setIsSpeaking(false);
      onEndRef.current?.();
    };
    utt.onerror = (e) => {
      console.warn('[TTS] error:', e.error);
      if (resumeInterval) clearInterval(resumeInterval);
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        setIsSpeaking(false);
      }
    };
    
    speechSynthesis.speak(utt);
    console.log('[TTS] utterance queued, speaking:', speechSynthesis.speaking, 'pending:', speechSynthesis.pending);
    
    // iOS Safari bug: synthesis can pause silently. Resume periodically.
    resumeInterval = setInterval(() => {
      if (!speechSynthesis.speaking && !speechSynthesis.pending) {
        if (resumeInterval) clearInterval(resumeInterval);
        return;
      }
      speechSynthesis.pause();
      speechSynthesis.resume();
    }, 3000);
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
