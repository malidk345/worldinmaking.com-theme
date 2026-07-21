import React, { ReactNode } from 'react';
import '../lemon-ui.css';

export interface LemonSnackProps {
  children: ReactNode;
  type?: 'default' | 'primary' | 'muted';
  onDismiss?: () => void;
  className?: string;
}

export function LemonSnack({ children, type = 'default', onDismiss, className = '' }: LemonSnackProps) {
  return (
    <span className={`LemonSnack inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-accent-3000)] text-[var(--text-3000)] border border-[var(--border-3000)] ${className}`}>
      <span>{children}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="hover:opacity-100 opacity-50 px-0.5 text-xs"
        >
          ×
        </button>
      )}
    </span>
  );
}
