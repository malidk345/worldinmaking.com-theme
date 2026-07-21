import React from 'react';

export interface KeyboardShortcutProps {
  keys: string[];
  className?: string;
}

export function KeyboardShortcut({ keys, className = '' }: KeyboardShortcutProps) {
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-[10px] ${className}`}>
      {keys.map((k, idx) => (
        <kbd
          key={idx}
          className="px-1.5 py-0.5 rounded border border-[var(--border-3000)] bg-[var(--color-bg-surface-primary)] text-[var(--text-3000)] font-semibold shadow-xs"
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}
