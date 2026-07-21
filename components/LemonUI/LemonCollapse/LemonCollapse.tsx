import React, { ReactNode, useState } from 'react';
import '../lemon-ui.css';

export interface LemonCollapsePanel {
  key: string;
  header: ReactNode;
  content: ReactNode;
}

export interface LemonCollapseProps {
  panels: LemonCollapsePanel[];
  defaultActiveKeys?: string[];
  className?: string;
}

export function LemonCollapse({ panels, defaultActiveKeys = [], className = '' }: LemonCollapseProps) {
  const [activeKeys, setActiveKeys] = useState<string[]>(defaultActiveKeys);

  const toggleKey = (key: string) => {
    setActiveKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div className={`LemonCollapse flex flex-col border border-[var(--border-3000)] rounded overflow-hidden ${className}`}>
      {panels.map((panel) => {
        const isOpen = activeKeys.includes(panel.key);
        return (
          <div key={panel.key} className="LemonCollapse__panel border-b border-[var(--border-3000)] last:border-b-0">
            <button
              type="button"
              onClick={() => toggleKey(panel.key)}
              className="w-full flex items-center justify-between p-3 text-xs font-semibold text-[var(--text-3000)] bg-[var(--color-bg-surface-primary)] hover:bg-[var(--color-bg-fill-button-tertiary-hover)] transition-colors text-left"
            >
              <span>{panel.header}</span>
              <span className={`transition-transform duration-200 opacity-60 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {isOpen && (
              <div className="p-3 text-xs text-[var(--text-3000)] bg-[var(--color-accent-3000)] border-t border-[var(--border-3000)]">
                {panel.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
