import React from 'react';
import { SidePanel } from '../../LemonUI/LemonDrawer/LemonDrawer';
import { LemonButton } from '../../LemonUI/LemonButton/LemonButton';
import { IconInfo, IconExternal, IconDocument } from '@posthog/icons';

export interface SidePanelInfoProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  docLinks?: { label: string; url: string }[];
  actions?: React.ReactNode;
}

export function SidePanelInfo({
  isOpen,
  onClose,
  title = 'Actions',
  description,
  docLinks = [],
  actions,
}: SidePanelInfoProps) {
  const sampleLinks =
    docLinks.length > 0
      ? docLinks
      : [
          { label: 'Getting started guide', url: 'https://posthog.com/docs' },
          { label: 'API reference', url: 'https://posthog.com/docs/api' },
          { label: 'Tutorials', url: 'https://posthog.com/tutorials' },
        ];

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
          <IconInfo className="size-4 text-[var(--primary-3000)]" />
          {title}
        </span>
      }
      description={description ?? 'Contextual information and quick actions'}
      width="22rem"
    >
      <div className="flex flex-col gap-4 py-2">
        {actions && <div className="flex flex-col gap-2">{actions}</div>}

        {sampleLinks.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-3000)] mb-1">Documentation</p>
            {sampleLinks.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 p-2 rounded border border-[var(--border-3000)] bg-[var(--color-bg-surface-primary)] hover:bg-[var(--color-bg-fill-button-tertiary-hover)] transition-colors group no-underline"
              >
                <span className="flex items-center gap-2 text-xs text-[var(--text-3000)] font-medium">
                  <IconDocument className="size-3.5 opacity-50" />
                  {link.label}
                </span>
                <IconExternal className="size-3 opacity-30 group-hover:opacity-70 transition-opacity shrink-0" />
              </a>
            ))}
          </div>
        )}
      </div>
    </SidePanel>
  );
}
