import { useCallback, useRef, useState } from 'react';
import { loadElevenLabsKey } from '../lib/storage';

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
}

const FEATURED_VOICES = ['Rachel', 'Adam', 'Antoni', 'Bella', 'Domi', 'Elli', 'Josh'];

export function useElevenLabs() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onEndRef = useRef<(() => void) | null>(null);
  const voiceIdRef = useRef('');

  const isConfigured = useCallback(() => !!loadElevenLabsKey(), []);

  const fetchVoices = useCallback(async () => {
    const apiKey = loadElevenLabsKey();
    if (!apiKey) return;
    setLoading(true);
    try {
      const res = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': apiKey },
      });
      if (!res.ok) throw new Error('Failed to fetch voices');
      const data = await res.json();
      const allVoices: ElevenLabsVoice[] = data.voices ?? [];
      // Sort: featured first, then alphabetical
      allVoices.sort((a, b) => {
        const aFeat = FEATURED_VOICES.indexOf(a.name);
        const bFeat = FEATURED_VOICES.indexOf(b.name);
        if (aFeat !== -1 && bFeat !== -1) return aFeat - bFeat;
        if (aFeat !== -1) return -1;
        if (bFeat !== -1) return 1;
        return a.name.localeCompare(b.name);
      });
      setVoices(allVoices);
    } catch (err) {
      console.error('ElevenLabs: failed to fetch voices', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const setVoice = useCallback((voiceId: string) => {
    voiceIdRef.current = voiceId;
  }, []);

  const speak = useCallback(async (text: string) => {
    const apiKey = loadElevenLabsKey();
    const voiceId = voiceIdRef.current;
    if (!apiKey || !voiceId) return false; // signal fallback needed

    // Stop any current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsSpeaking(true);
    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: { stability: 0.5, similarity_boost: 0.5 },
          }),
        },
      );
      if (!res.ok) {
        console.error('ElevenLabs TTS failed', res.status);
        setIsSpeaking(false);
        return false;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
        onEndRef.current?.();
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };
      await audio.play();
      return true;
    } catch (err) {
      console.error('ElevenLabs TTS error', err);
      setIsSpeaking(false);
      return false;
    }
  }, []);

  const cancel = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const onSpeakEnd = useCallback((cb: () => void) => {
    onEndRef.current = cb;
  }, []);

  return { isSpeaking, voices, loading, speak, cancel, setVoice, fetchVoices, onSpeakEnd, isConfigured };
}
