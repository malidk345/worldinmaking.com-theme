import React, { ReactNode } from 'react';
import '../lemon-ui.css';

export type LemonTagType =
  | 'primary'
  | 'option'
  | 'highlight'
  | 'warning'
  | 'danger'
  | 'success'
  | 'default'
  | 'muted'
  | 'completion';

export interface LemonTagProps {
  type?: LemonTagType;
  size?: 'small' | 'medium';
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  onClose?: () => void;
}

export function LemonTag({
  type = 'default',
  size = 'medium',
  icon,
  children,
  className = '',
  onClose,
}: LemonTagProps) {
  const classes = [
    'LemonTag',
    `LemonTag--size-${size}`,
    `LemonTag--${type}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      {icon && <span className="LemonTag__icon">{icon}</span>}
      {children}
      {onClose && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="LemonTag__close ml-1 hover:opacity-100 opacity-60 bg-transparent border-none p-0 cursor-pointer"
        >
          ×
        </button>
      )}
    </div>
  );
}
