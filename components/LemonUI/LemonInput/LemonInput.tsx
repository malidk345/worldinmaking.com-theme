import React, { forwardRef, ReactNode } from 'react';
import { IconSearch } from '@posthog/icons';
import '../lemon-ui.css';

export interface LemonInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  status?: 'default' | 'danger';
  size?: 'xsmall' | 'small' | 'medium' | 'large';
  prefix?: ReactNode;
  suffix?: ReactNode;
  icon?: ReactNode;
  fullWidth?: boolean;
  allowClear?: boolean;
  onClear?: () => void;
}

export const LemonInput = forwardRef<HTMLInputElement, LemonInputProps>(function LemonInput(
  {
    status = 'default',
    size = 'medium',
    prefix,
    suffix,
    icon,
    fullWidth = false,
    allowClear = false,
    onClear,
    className = '',
    value,
    type = 'text',
    ...props
  },
  ref
) {
  let effectivePrefix = prefix || icon;
  if (!effectivePrefix && type === 'search') {
    effectivePrefix = <IconSearch />;
  }

  const classes = [
    'LemonInput',
    'input-like',
    status !== 'default' && `LemonInput--status-${status}`,
    type && `LemonInput--type-${type}`,
    size && `LemonInput--${size}`,
    fullWidth && 'LemonInput--full-width',
    value && 'LemonInput--has-content',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes}>
      {effectivePrefix && <span className="LemonInput__prefix">{effectivePrefix}</span>}
      <input
        ref={ref}
        type={type}
        value={value}
        className="LemonInput__input"
        {...props}
      />
      {allowClear && value && (
        <button
          type="button"
          className="LemonInput__clear cursor-pointer border-none bg-transparent"
          onClick={onClear}
        >
          ×
        </button>
      )}
      {suffix && <span className="LemonInput__suffix">{suffix}</span>}
    </span>
  );
});
LemonInput.displayName = 'LemonInput';
