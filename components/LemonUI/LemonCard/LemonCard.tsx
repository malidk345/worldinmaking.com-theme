import React, { forwardRef, ReactNode } from 'react';
import { IconX } from '@posthog/icons';
import { LemonButton } from '../LemonButton/LemonButton';
import '../lemon-ui.css';

export interface LemonCardProps {
  hoverEffect?: boolean;
  className?: string;
  children?: ReactNode;
  onClick?: (e?: React.MouseEvent) => void;
  focused?: boolean;
  closeable?: boolean;
  onClose?: () => void;
}

export const LemonCard = forwardRef<HTMLDivElement, LemonCardProps>(function LemonCard(
  {
    hoverEffect = true,
    className = '',
    children,
    onClick,
    focused,
    closeable = false,
    onClose,
    ...props
  },
  ref
) {
  const isCloseable = closeable || !!onClose;
  const classes = [
    'LemonCard',
    'border rounded p-6 bg-[var(--color-bg-surface-primary)] relative',
    hoverEffect && 'LemonCard--hoverEffect',
    focused ? 'border-2 border-[var(--primary-3000)]' : 'border-[var(--border-3000)]',
    onClick && !focused && 'cursor-pointer',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={ref} className={classes} onClick={onClick} {...props}>
      {isCloseable && (
        <div className="absolute top-2 right-2 z-10">
          <LemonButton
            icon={<IconX className="size-4" />}
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            type="tertiary"
            size="xsmall"
          />
        </div>
      )}
      {children}
    </div>
  );
});
LemonCard.displayName = 'LemonCard';
