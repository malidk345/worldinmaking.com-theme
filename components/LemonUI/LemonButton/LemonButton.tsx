import React, { forwardRef, ReactNode } from 'react';
import Link from 'components/Link';
import type { LinkState } from 'components/Link';
import '../lemon-ui.css';

// Adding 'stealth' and 'muted' for backward compatibility during refactoring
export interface LemonButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement | HTMLAnchorElement>, 'type' | 'title' | 'onClick'> {
  type?: 'primary' | 'secondary' | 'tertiary' | 'stealth' | 'muted';
  variant?: 'primary' | 'secondary' | 'tertiary' | 'stealth' | 'muted';
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
  to?: string;
  state?: LinkState;
  title?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement> | React.MouseEvent<HTMLAnchorElement>) => void;
}

export const LemonButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, LemonButtonProps>(function LemonButton(
  {
    type = 'tertiary',
    variant,
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
    to,
    state,
    ...props
  },
  ref
) {
  const buttonType = variant || type;
  const isDisabled = disabled || !!disabledReason;
  const tooltipTitle = typeof disabledReason === 'string' ? disabledReason : title;

  const classes = [
    'LemonButton',
    `LemonButton--${buttonType}`,
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

  const content = (
    <span className="LemonButton__chrome">
      {icon ? <span className="LemonButton__icon">{icon}</span> : null}
      {children ? <span className="LemonButton__content">{children}</span> : null}
      {sideIcon ? <span className="LemonButton__icon">{sideIcon}</span> : null}
    </span>
  );

  if (to) {
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        to={to}
        state={state}
        title={tooltipTitle}
        className={classes}
        aria-disabled={isDisabled}
        onClick={(e: any) => {
          if (isDisabled) {
            e.preventDefault();
            return;
          }
          onClick?.(e);
        }}
        {...(props as Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'type' | 'onClick'>)}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={htmlType}
      aria-disabled={isDisabled}
      title={tooltipTitle}
      className={classes}
      onClick={(e: any) => {
        if (isDisabled) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...(props as Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'onClick'>)}
    >
      {content}
    </button>
  );
});
LemonButton.displayName = 'LemonButton';
