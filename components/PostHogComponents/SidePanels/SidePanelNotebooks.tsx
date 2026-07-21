import React, { useState } from 'react';
import { SidePanel } from '../../LemonUI/LemonDrawer/LemonDrawer';
import { LemonButton } from '../../LemonUI/LemonButton/LemonButton';
import { LemonInput } from '../../LemonUI/LemonInput/LemonInput';
import { LemonTag } from '../../LemonUI/LemonTag/LemonTag';
import { LemonDivider } from '../../LemonUI/LemonDivider/LemonDivider';
import { IconDocument, IconPlus, IconSearch } from '@posthog/icons';

export interface Notebook {
  id: string;
  title: string;
  snippet?: string;
  lastEditedAt: string;
  pinned?: boolean;
}

export interface SidePanelNotebooksProps {
  isOpen: boolean;
  onClose: () => void;
  notebooks?: Notebook[];
  onOpenNotebook?: (id: string) => void;
  onCreateNotebook?: () => void;
}

export function SidePanelNotebooks({
  isOpen,
  onClose,
  notebooks = [],
  onOpenNotebook,
  onCreateNotebook,
}: SidePanelNotebooksProps) {
  const [search, setSearch] = useState('');

  const sampleNotebooks: Notebook[] =
    notebooks.length > 0
      ? notebooks
      : [
          { id: '1', title: 'Funnel analysis Q3', snippet: 'Drop-off at step 3 checkout page...', lastEditedAt: '2h ago', pinned: true },
          { id: '2', title: 'Session replay findings', snippet: 'Users click the button 3 times before...', lastEditedAt: '1d ago' },
          { id: '3', title: 'Onboarding cohort investigation', snippet: 'Cohort created on Oct 10...', lastEditedAt: '3d ago' },
          { id: '4', title: 'Feature flags notes', snippet: 'Rolling out new flag to 20% of users...', lastEditedAt: '1w ago' },
        ];

  const filtered = sampleNotebooks.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      (n.snippet ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const pinned = filtered.filter((n) => n.pinned);
  const rest = filtered.filter((n) => !n.pinned);

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
          <IconDocument className="size-4 text-[var(--primary-3000)]" />
          Notebooks
        </span>
      }
      description="Your analysis notebooks and scratch pads"
      width="26rem"
      footer={
        <LemonButton
          icon={<IconPlus className="size-3.5" />}
          type="primary"
          fullWidth
          onClick={onCreateNotebook}
        >
          New notebook
        </LemonButton>
      }
    >
      <div className="flex flex-col gap-3 py-2">
        {/* Search */}
        <LemonInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notebooks..."
          fullWidth
          size="small"
          prefix={<IconSearch className="size-3.5 opacity-50" />}
        />

        {/* Pinned */}
        {pinned.length > 0 && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-3000)]">Pinned</p>
            {pinned.map((nb) => (
              <NotebookRow key={nb.id} notebook={nb} onClick={() => onOpenNotebook?.(nb.id)} />
            ))}
            <LemonDivider />
          </>
        )}

        {/* All */}
        {rest.length > 0 ? (
          <>
            {pinned.length > 0 && (
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-3000)]">All notebooks</p>
            )}
            {rest.map((nb) => (
              <NotebookRow key={nb.id} notebook={nb} onClick={() => onOpenNotebook?.(nb.id)} />
            ))}
          </>
        ) : (
          filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-[var(--muted-3000)]">
              <IconDocument className="size-8 opacity-30" />
              <span className="text-xs">{search ? 'No notebooks match your search' : 'No notebooks yet'}</span>
            </div>
          )
        )}
      </div>
    </SidePanel>
  );
}

function NotebookRow({ notebook, onClick }: { notebook: Notebook; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex flex-col gap-0.5 p-2.5 rounded border border-[var(--border-3000)] bg-[var(--color-bg-surface-primary)] hover:bg-[var(--color-bg-fill-button-tertiary-hover)] transition-colors cursor-pointer"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--text-3000)] truncate">{notebook.title}</span>
        <span className="text-[10px] text-[var(--muted-3000)] font-mono shrink-0">{notebook.lastEditedAt}</span>
      </div>
      {notebook.snippet && (
        <span className="text-[11px] text-[var(--muted-3000)] line-clamp-1 leading-relaxed">{notebook.snippet}</span>
      )}
    </button>
  );
}
