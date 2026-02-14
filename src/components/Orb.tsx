import { useRef } from 'react';
import type { OrbState } from '../types';

const stateStyles: Record<OrbState, { bg: string; ring: string; anim: string; glow: string }> = {
  idle: {
    bg: 'bg-gradient-to-br from-gray-700 to-gray-800',
    ring: 'ring-gray-600',
    anim: '',
    glow: '',
  },
  'vad-ready': {
    bg: 'bg-gradient-to-br from-purple-600 to-indigo-700',
    ring: 'ring-purple-400',
    anim: 'animate-pulse-slow',
    glow: 'shadow-[0_0_40px_rgba(147,51,234,0.4)]',
  },
  listening: {
    bg: 'bg-gradient-to-br from-blue-500 to-blue-700',
    ring: 'ring-blue-400',
    anim: 'animate-pulse-fast',
    glow: 'shadow-[0_0_60px_rgba(59,130,246,0.5)]',
  },
  processing: {
    bg: 'bg-gradient-to-br from-yellow-500 to-amber-600',
    ring: 'ring-yellow-400',
    anim: 'animate-pulse-slow',
    glow: 'shadow-[0_0_60px_rgba(234,179,8,0.5)]',
  },
  speaking: {
    bg: 'bg-gradient-to-br from-green-500 to-emerald-600',
    ring: 'ring-green-400',
    anim: 'animate-pulse-slow',
    glow: 'shadow-[0_0_60px_rgba(34,197,94,0.5)]',
  },
};

const stateLabels: Record<OrbState, string> = {
  idle: 'Tap or hold to speak',
  'vad-ready': 'Listening for voice…',
  listening: 'Listening...',
  processing: 'Thinking...',
  speaking: 'Speaking...',
};

interface OrbProps {
  state: OrbState;
  onClick: () => void;
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
  transcript?: string;
  vadActive?: boolean;
}

export default function Orb({ state, onClick, onHoldStart, onHoldEnd, transcript, vadActive }: OrbProps) {
  const s = stateStyles[state];
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldingRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    holdTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      onHoldStart?.();
    }, 200);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      onHoldEnd?.();
    } else {
      onClick();
    }
  };

  const handlePointerCancel = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      onHoldEnd?.();
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerCancel}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => { if (e.code === 'Space') e.preventDefault(); }}
        onKeyUp={(e) => { if (e.code === 'Space') e.preventDefault(); }}
        tabIndex={-1}
        style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
        className={`
          relative w-40 h-40 rounded-full ring-4 transition-all duration-500
          ${s.bg} ${s.ring} ${s.anim} ${s.glow}
          cursor-pointer active:scale-95 hover:brightness-110
          flex items-center justify-center
        `}
      >
        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm" />
        <svg className="absolute w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          {state === 'listening' ? (
            <rect x="6" y="6" width="12" height="12" rx="2" />
          ) : (
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          )}
        </svg>
      </button>
      <p className="text-gray-400 text-sm font-medium tracking-wide">
        {stateLabels[state]}
      </p>
      {vadActive && state !== 'listening' && state !== 'vad-ready' && (
        <p className="text-purple-400 text-xs">VAD active</p>
      )}
      {transcript && (
        <p className="text-white/60 text-sm max-w-xs text-center italic">
          &ldquo;{transcript}&rdquo;
        </p>
      )}
    </div>
  );
}
