import React from 'react';
import '../lemon-ui.css';

export interface LettermarkProps {
  name?: string;
  index?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Lettermark({ name = '?', index = 0, size = 'md', className = '' }: LettermarkProps) {
  const initial = (name.charAt(0) || '?').toUpperCase();
  const colors = ['Lettermark--0', 'Lettermark--1', 'Lettermark--2', 'Lettermark--3', 'Lettermark--4'];
  const colorClass = colors[Math.abs(index || name.charCodeAt(0) || 0) % colors.length];

  return (
    <span className={`Lettermark Lettermark--${size} ${colorClass} ${className}`}>
      {initial}
    </span>
  );
}
