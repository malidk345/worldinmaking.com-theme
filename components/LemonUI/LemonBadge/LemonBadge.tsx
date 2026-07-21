import React, { ReactNode } from 'react';
import '../lemon-ui.css';

export interface LemonBadgeProps {
  content?: ReactNode;
  children?: ReactNode;
  active?: boolean;
  status?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  className?: string;
}

export function LemonBadge({
  content,
  children,
  active = true,
  status = 'primary',
  position = 'top-right',
  className = '',
}: LemonBadgeProps) {
  if (!children) {
    return active ? (
      <span className={`LemonBadge LemonBadge--standalone LemonBadge--${status} ${className}`} />
    ) : null;
  }

  return (
    <span className="LemonBadge__wrapper relative inline-flex">
      {children}
      {active && (
        <span
          className={`LemonBadge LemonBadge--positioned LemonBadge--${position} LemonBadge--${status} ${className}`}
        >
          {content}
        </span>
      )}
    </span>
  );
}

export function LemonBadgeDot({ active = true, status = 'primary', className = '' }: { active?: boolean; status?: string; className?: string }) {
  if (!active) return null;
  return <span className={`LemonBadgeDot LemonBadge--${status} ${className}`} />;
}
