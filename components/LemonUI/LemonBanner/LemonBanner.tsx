import React, { ReactNode } from 'react';
import { IconInfo, IconWarning, IconX } from '@posthog/icons';
import { LemonButton } from '../LemonButton/LemonButton';
import '../lemon-ui.css';

export interface LemonBannerAction {
  children: ReactNode;
  onClick: () => void;
}

export interface LemonBannerProps {
  type?: 'info' | 'warning' | 'error' | 'success';
  onClose?: () => void;
  children: ReactNode;
  action?: LemonBannerAction;
  className?: string;
  hideIcon?: boolean;
  icon?: ReactNode;
}

export function LemonBanner({
  type = 'info',
  onClose,
  children,
  action,
  className = '',
  hideIcon = false,
  icon,
}: LemonBannerProps): JSX.Element {
  return (
    <div className={`LemonBanner LemonBanner--${type} ${className}`}>
      <div className="flex items-center gap-2 grow">
        {!hideIcon &&
          (icon ? (
            icon
          ) : type === 'warning' || type === 'error' ? (
            <IconWarning className="LemonBanner__icon shrink-0" />
          ) : (
            <IconInfo className="LemonBanner__icon shrink-0" />
          ))}
        <div className="grow overflow-hidden">{children}</div>
        {action && (
          <LemonButton size="small" type="secondary" onClick={action.onClick}>
            {action.children}
          </LemonButton>
        )}
        {onClose && (
          <LemonButton size="xsmall" icon={<IconX />} onClick={onClose} aria-label="close" />
        )}
      </div>
    </div>
  );
}
