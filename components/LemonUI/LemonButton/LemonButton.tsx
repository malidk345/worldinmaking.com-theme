import React, { forwardRef, ReactNode } from 'react';
import '../lemon-ui.css';

export interface LemonButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  type?: 'primary' | 'secondary' | 'tertiary';
  status?: 'default' | 'alt' | 'danger';
  size?: 'xxsmall' | 'xsmall' | 'small' | 'medium' | 'large';
  icon?: ReactNode;
  sideIcon?: ReactNode;
  fullWidth?: boolean;
  active?: boolean;
  loading?: boolean;
  noPadding?: boolean;
  center?: boolean;
  truncate?: boolean;
  disabledReason?: ReactNode | string | boolean;
  htmlType?: 'button' | 'submit' | 'reset';
  children?: ReactNode;
}

export const LemonButton = forwardRef<HTMLButtonElement, LemonButtonProps>(function LemonButton(
  {
    type = 'secondary',
    status = 'default',
    size = 'medium',
    icon,
    sideIcon,
    fullWidth = false,
    active = false,
    loading = false,
    noPadding = false,
    center = false,
    truncate = false,
    disabledReason,
    htmlType = 'button',
    children,
    className = '',
    disabled,
    title,
    onClick,
    ...props
  },
  ref
) {
  const isDisabled = disabled || !!disabledReason;
  const tooltipTitle = typeof disabledReason === 'string' ? disabledReason : title;

  const classes = [
    'LemonButton',
    `LemonButton--${type}`,
    `LemonButton--status-${status}`,
    loading && 'LemonButton--loading',
    noPadding && 'LemonButton--no-padding',
    size && `LemonButton--${size}`,
    active && 'LemonButton--active',
    fullWidth && 'LemonButton--full-width',
    center && 'LemonButton--centered',
    !children && 'LemonButton--no-content',
    !!icon && 'LemonButton--has-icon',
    !!sideIcon && 'LemonButton--has-side-icon',
    truncate && 'LemonButton--truncate',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type={htmlType}
      aria-disabled={isDisabled}
      title={tooltipTitle}
      className={classes}
      onClick={(e) => {
        if (isDisabled) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...props}
    >
      <span className="LemonButton__chrome">
        {icon ? <span className="LemonButton__icon">{icon}</span> : null}
        {children ? <span className="LemonButton__content">{children}</span> : null}
        {sideIcon ? <span className="LemonButton__icon">{sideIcon}</span> : null}
      </span>
    </button>
  );
});
LemonButton.displayName = 'LemonButton';
