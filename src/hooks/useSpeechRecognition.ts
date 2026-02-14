import { useCallback, useRef, useState } from 'react';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [supported] = useState(() => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const recRef = useRef<ReturnType<typeof createRecognition> | null>(null);
  const onResultRef = useRef<((text: string) => void) | null>(null);
  const wantListeningRef = useRef(false);
  const lastTranscriptRef = useRef('');

  function createRecognition() {
    const SR = (window as unknown as Record<string, unknown>).SpeechRecognition ??
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SR) return null;
    const rec = new (SR as new () => SpeechRecognition)();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    return rec;
  }

  const start = useCallback(() => {
    if (!supported) return;
    // Abort any existing session
    if (recRef.current) {
      try { recRef.current.abort(); } catch { /* ignore */ }
    }
    const rec = createRecognition();
    if (!rec) return;
    recRef.current = rec;
    wantListeningRef.current = true;
    lastTranscriptRef.current = '';
    setTranscript('');
    setError('');

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let full = '';
      for (let i = 0; i < e.results.length; i++) {
        full += e.results[i][0].transcript;
      }
      lastTranscriptRef.current = full;
      setTranscript(full);
    };

    rec.onend = () => {
      // If we still want to be listening (user hasn't released), restart
      if (wantListeningRef.current) {
        try { rec.start(); } catch { /* ignore */ }
        return;
      }
      setIsListening(false);
      const text = lastTranscriptRef.current.trim();
      if (text) onResultRef.current?.(text);
    };

    rec.onerror = (e: unknown) => {
      const err = e as { error?: string };
      // 'no-speech' and 'aborted' are not fatal — let onend handle restart
      if (err.error === 'no-speech' || err.error === 'aborted') return;
      wantListeningRef.current = false;
      setIsListening(false);
      setError(`STT error: ${err.error || 'unknown'}`);
    };

    rec.start();
    setIsListening(true);
  }, [supported]);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    if (recRef.current) {
      try { recRef.current.stop(); } catch { /* ignore */ }
    }
  }, []);

  const onFinalResult = useCallback((cb: (text: string) => void) => {
    onResultRef.current = cb;
  }, []);

  return { isListening, transcript, supported, start, stop, onFinalResult, error };
}

// Augment window types
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
