interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
  sublabel?: string;
}

export default function ToggleSwitch({ enabled, onChange, label, sublabel }: ToggleSwitchProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className="flex items-center gap-3 group"
      role="switch"
      aria-checked={enabled}
    >
      <div
        className={`
          relative w-12 h-7 rounded-full transition-colors duration-300
          ${enabled ? 'bg-purple-500' : 'bg-gray-600'}
        `}
      >
        <div
          className={`
            absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md
            transition-transform duration-300
            ${enabled ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </div>
      {(label || sublabel) && (
        <div className="text-left">
          {label && (
            <span className={`text-sm font-medium ${enabled ? 'text-purple-300' : 'text-gray-400'}`}>
              {label}
            </span>
          )}
          {sublabel && (
            <p className="text-xs text-gray-500">{sublabel}</p>
          )}
        </div>
      )}
    </button>
  );
}
