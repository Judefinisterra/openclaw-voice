import { useCallback, useRef, useState } from 'react';
import { load, save } from '../lib/storage';

export function useWhisper() {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onResultRef = useRef<((text: string) => void) | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const getApiKey = useCallback(() => load<string>('openaiApiKey', ''), []);
  const isConfigured = useCallback(() => !!getApiKey(), [getApiKey]);

  const start = useCallback(async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setError('OpenAI API key not configured');
      return;
    }

    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          sampleRate: 16000 
        } 
      });
      streamRef.current = stream;

      // Use webm/opus if available, fallback to mp4
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;

        if (chunksRef.current.length === 0) {
          setIsListening(false);
          return;
        }

        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        // Send to Whisper API
        try {
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const formData = new FormData();
          formData.append('file', blob, `audio.${ext}`);
          formData.append('model', 'whisper-1');
          formData.append('language', 'en');

          const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}` },
            body: formData,
          });

          if (!resp.ok) {
            const err = await resp.text();
            console.error('[Whisper] API error:', resp.status, err);
            setError(`Whisper error: ${resp.status}`);
            setIsListening(false);
            return;
          }

          const result = await resp.json();
          const text = result.text?.trim();
          if (text) {
            onResultRef.current?.(text);
          }
        } catch (e) {
          console.error('[Whisper] transcription error:', e);
          setError('Transcription failed');
        }

        setIsListening(false);
      };

      recorder.start(1000); // collect in 1s chunks
      setIsListening(true);
    } catch (e) {
      console.error('[Whisper] mic error:', e);
      setError('Microphone access denied');
      setIsListening(false);
    }
  }, [getApiKey]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const onFinalResult = useCallback((cb: (text: string) => void) => {
    onResultRef.current = cb;
  }, []);

  return {
    isListening,
    error,
    transcript: isListening ? 'Recording...' : '',
    start,
    stop,
    onFinalResult,
    isConfigured,
    supported: true, // MediaRecorder is widely supported
  };
}

// Settings helpers
export function loadOpenAIKey(): string {
  return load<string>('openaiApiKey', '');
}

export function saveOpenAIKey(key: string): void {
  save('openaiApiKey', key);
}
