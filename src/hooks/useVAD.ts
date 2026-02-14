import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Lightweight VAD using Web Audio API's AnalyserNode.
 * No external dependency needed - just detects audio energy above a threshold.
 */
export function useVAD() {
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);

  // Tuning
  const SPEECH_THRESHOLD = 15; // energy level to consider speech
  const SILENCE_DELAY_MS = 1200; // ms of silence before "speech end"
  const MIN_SPEECH_MS = 300; // min speech duration to trigger

  const onSpeechStartRef = useRef<(() => void) | null>(null);
  const onSpeechEndRef = useRef<(() => void) | null>(null);

  const speechStartTimeRef = useRef(0);
  const silenceStartRef = useRef(0);
  const wasSpeakingRef = useRef(false);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new AudioContext();
      ctxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const check = () => {
        analyser.getByteFrequencyData(dataArray);
        // Average energy
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;

        const now = Date.now();

        if (avg > SPEECH_THRESHOLD) {
          silenceStartRef.current = 0;
          if (!wasSpeakingRef.current) {
            wasSpeakingRef.current = true;
            speechStartTimeRef.current = now;
            setIsSpeaking(true);
            onSpeechStartRef.current?.();
          }
        } else {
          if (wasSpeakingRef.current) {
            if (silenceStartRef.current === 0) {
              silenceStartRef.current = now;
            } else if (now - silenceStartRef.current > SILENCE_DELAY_MS) {
              const speechDuration = now - speechStartTimeRef.current;
              wasSpeakingRef.current = false;
              setIsSpeaking(false);
              if (speechDuration > MIN_SPEECH_MS) {
                onSpeechEndRef.current?.();
              }
            }
          }
        }

        rafRef.current = requestAnimationFrame(check);
      };

      rafRef.current = requestAnimationFrame(check);
      setIsActive(true);
    } catch (err) {
      console.error('VAD: mic access failed', err);
    }
  }, [SILENCE_DELAY_MS, MIN_SPEECH_MS, SPEECH_THRESHOLD]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close();
    streamRef.current = null;
    ctxRef.current = null;
    analyserRef.current = null;
    wasSpeakingRef.current = false;
    setIsActive(false);
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      ctxRef.current?.close();
    };
  }, []);

  const onSpeechStart = useCallback((cb: () => void) => {
    onSpeechStartRef.current = cb;
  }, []);

  const onSpeechEnd = useCallback((cb: () => void) => {
    onSpeechEndRef.current = cb;
  }, []);

  return { isActive, isSpeaking, start, stop, onSpeechStart, onSpeechEnd };
}
