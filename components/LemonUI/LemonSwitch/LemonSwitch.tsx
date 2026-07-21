import React, { ReactNode } from 'react';
import '../lemon-ui.css';

export interface LemonSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function LemonSwitch({ checked, onChange, label, disabled = false, className = '' }: LemonSwitchProps) {
  return (
    <label className={`inline-flex items-center gap-2 cursor-pointer select-none ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}>
      <div
        onClick={() => onChange(!checked)}
        className={`LemonSwitch ${checked ? 'LemonSwitch--checked' : ''}`}
      >
        <div className="LemonSwitch__handle" />
      </div>
      {label && (
        <span className="text-xs font-medium text-[var(--text-3000)]">
          {label}
        </span>
      )}
    </label>
  );
}
