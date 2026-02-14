import { useCallback, useRef, useState } from 'react';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported] = useState(() => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const recRef = useRef<ReturnType<typeof createRecognition> | null>(null);
  const onResultRef = useRef<((text: string) => void) | null>(null);

  function createRecognition() {
    const SR = (window as unknown as Record<string, unknown>).SpeechRecognition ??
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SR) return null;
    const rec = new (SR as new () => SpeechRecognition)();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    return rec;
  }

  const start = useCallback(() => {
    if (!supported) return;
    const rec = createRecognition();
    if (!rec) return;
    recRef.current = rec;
    setTranscript('');

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }
      const text = final || interim;
      setTranscript(text);
    };

    rec.onend = () => {
      setIsListening(false);
      // Get final transcript
      setTranscript((t) => {
        if (t.trim()) onResultRef.current?.(t.trim());
        return t;
      });
    };

    rec.onerror = () => {
      setIsListening(false);
    };

    rec.start();
    setIsListening(true);
  }, [supported]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setIsListening(false);
  }, []);

  const onFinalResult = useCallback((cb: (text: string) => void) => {
    onResultRef.current = cb;
  }, []);

  return { isListening, transcript, supported, start, stop, onFinalResult };
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
