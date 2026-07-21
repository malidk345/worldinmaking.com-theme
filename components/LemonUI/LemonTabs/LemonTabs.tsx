import React, { ReactNode } from 'react';
import '../lemon-ui.css';

export interface LemonTab<T extends string> {
  key: T;
  label: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
}

export interface LemonTabsProps<T extends string> {
  activeKey: T;
  onChange: (key: T) => void;
  tabs: LemonTab<T>[];
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export function LemonTabs<T extends string>({
  activeKey,
  onChange,
  tabs,
  className = '',
}: LemonTabsProps<T>) {
  return (
    <div className={`LemonTabs ${className}`}>
      <div className="LemonTabs__bar">
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <button
              key={tab.key}
              type="button"
              disabled={tab.disabled}
              onClick={() => onChange(tab.key)}
              className={`LemonTab ${isActive ? 'LemonTab--active' : ''}`}
            >
              {tab.icon && <span className="LemonTab__icon mr-1.5">{tab.icon}</span>}
              <span className="LemonTab__label">{tab.label}</span>
              {tab.badge && <span className="LemonTab__badge ml-1.5">{tab.badge}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
