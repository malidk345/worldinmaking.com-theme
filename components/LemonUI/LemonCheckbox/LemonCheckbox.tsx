import React, { ReactNode } from 'react';
import '../lemon-ui.css';

export interface LemonCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function LemonCheckbox({ checked, onChange, label, disabled = false, className = '' }: LemonCheckboxProps) {
  return (
    <label className={`inline-flex items-center gap-2 cursor-pointer select-none ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-[var(--border-3000)] accent-[var(--primary-3000)]"
      />
      {label && <span className="text-xs text-[var(--text-3000)]">{label}</span>}
    </label>
  );
}
