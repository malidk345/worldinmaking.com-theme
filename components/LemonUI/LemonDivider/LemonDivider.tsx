import React from 'react';
import '../lemon-ui.css';

export interface LemonDividerProps {
  className?: string;
  dashed?: boolean;
}

export function LemonDivider({ className = '', dashed = false }: LemonDividerProps) {
  return (
    <div
      className={`w-full h-px my-3 ${dashed ? 'border-b border-dashed border-[var(--border-3000)]' : 'bg-[var(--border-3000)]'} ${className}`}
    />
  );
}
