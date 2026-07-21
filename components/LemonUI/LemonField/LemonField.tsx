import React, { ReactNode } from 'react';
import '../lemon-ui.css';

export interface LemonFieldProps {
  label?: ReactNode;
  error?: ReactNode;
  help?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function LemonField({ label, error, help, children, className = '' }: LemonFieldProps) {
  return (
    <div className={`LemonField flex flex-col gap-1 ${className}`}>
      {label && <label className="LemonField__label text-xs font-semibold text-[var(--text-3000)]">{label}</label>}
      {children}
      {error && <span className="LemonField__error text-[11px] text-red-500 font-medium">{error}</span>}
      {help && <span className="LemonField__help text-[11px] opacity-60 text-[var(--text-3000)]">{help}</span>}
    </div>
  );
}
