import React from 'react';
import '../lemon-ui.css';

export interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function Spinner({ size = 'medium', className = '' }: SpinnerProps) {
  return (
    <span className={`LemonSpinner LemonSpinner--${size} inline-block border-2 border-current border-r-transparent rounded-full animate-spin ${className}`} />
  );
}
