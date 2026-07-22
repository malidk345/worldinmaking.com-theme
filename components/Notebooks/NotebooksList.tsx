import React, { useState } from 'react';
import { IconEllipsis, IconTrash, IconSearch } from '@posthog/icons';
import {
  LemonButton,
  LemonInput,
  LemonTag,
  LemonBanner,
  LemonSelect,
  LemonTable,
  Column,
} from '../LemonUI';

export const fromNodeTypeToLabel: Record<string, string> = {
  feature_flag: 'Feature flags',
  feature_flag_code_example: 'Feature flag Code Examples',
  experiment: 'Experiments',
  early_access_feature: 'Early Access Features',
  survey: 'Surveys',
  image: 'Images',
  person: 'Persons',
  query: 'Queries',
  python: 'Python',
  duck_sql: 'SQL (DuckDB)',
  hog_ql_sql: 'SQL (HogQL)',
  recording: 'Session recordings',
  recording_playlist: 'Session replay playlists',
  cohort: 'Cohorts',
  group: 'Groups',
  issues: 'Issues',
  customer_journey: 'Customer journey',
  support_tickets: 'Support tickets',
};

export interface NotebookListItemType {
  short_id: string;
  title: string;
  created_by?: {
    first_name?: string;
    email?: string;
  };
  created_at: string;
  last_modified_at: string;
  is_template?: boolean;
}

const DEFAULT_NOTEBOOKS: NotebookListItemType[] = [
  {
    short_id: 'nb-1',
    title: 'User Onboarding Drop-off Analysis',
    created_by: { first_name: 'James Hawkins', email: 'james@posthog.com' },
    created_at: '2026-07-15 10:30',
    last_modified_at: '2026-07-20 14:22',
  },
  {
    short_id: 'nb-2',
    title: 'Funnel & Session Replay Insights',
    created_by: { first_name: 'Marius Andra', email: 'marius@posthog.com' },
    created_at: '2026-07-18 09:12',
    last_modified_at: '2026-07-21 18:45',
  },
  {
    short_id: 'nb-3',
    title: 'Standard Feature Exploration Template',
    created_by: { first_name: 'PostHog Team', email: 'team@posthog.com' },
    created_at: '2026-06-01 12:00',
    last_modified_at: '2026-07-10 08:15',
    is_template: true,
  },
];

export function NotebooksListSkeleton() {
  const [search, setSearch] = useState('');
  const [selectedCreator, setSelectedCreator] = useState<string>('');
  const [selectedContains, setSelectedContains] = useState<string>('');
  const [notebooks, setNotebooks] = useState<NotebookListItemType[]>(DEFAULT_NOTEBOOKS);
  const [showBanner, setShowBanner] = useState(true);

  const filteredNotebooks = notebooks.filter((nb) => {
    const matchesSearch = (nb.title || '').toLowerCase().includes(search.toLowerCase());
    const matchesCreator = !selectedCreator || nb.created_by?.first_name === selectedCreator;
    return matchesSearch && matchesCreator;
  });

  const handleDelete = (short_id: string) => {
    setNotebooks((prev) => prev.filter((item) => item.short_id !== short_id));
  };

  const columns: Column<NotebookListItemType>[] = [
    {
      title: 'Title',
      dataIndex: 'title',
      width: '45%',
      render: (title, { short_id, is_template }) => (
        <a
          data-attr="notebook-title"
          href={`#notebook-${short_id}`}
          className="font-semibold flex items-center gap-2 text-[var(--text-3000,#111827)] hover:text-[var(--primary-3000-hover,#1d4ed8)] hover:underline"
        >
          {String(title || 'Untitled')}
          {is_template && <LemonTag type="highlight">TEMPLATE</LemonTag>}
        </a>
      ),
    },
    {
      title: 'Created by',
      render: (_, notebook) => notebook.created_by?.first_name || '—',
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      render: (created_at) => <span className="font-mono text-xs opacity-75">{String(created_at)}</span>,
    },
    {
      title: 'Last modified',
      dataIndex: 'last_modified_at',
      render: (last_modified_at) => <span className="font-mono text-xs opacity-75">{String(last_modified_at)}</span>,
    },
    {
      title: '',
      render: (_, notebook) => {
        if (notebook.is_template) {
          return null;
        }
        return (
          <LemonButton
            aria-label="more"
            icon={<IconTrash className="size-3.5 text-red-500" />}
            size="small"
            type="tertiary"
            onClick={() => handleDelete(notebook.short_id)}
          />
        );
      },
    },
  ];

  return (
    <div className="scene-content flex flex-col gap-y-4 relative z-10 p-6 max-w-7xl mx-auto w-full font-sans">
      {/* SceneTitleSection 1-to-1 PostHog DOM Structure */}
      <div className="group/scene-title-section bg-primary sticky -top-4 z-30 pb-3 border-b border-[var(--border-3000,#e5e7eb)] flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-3000,#111827)] m-0">
            Notebooks
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <LemonButton icon={<IconEllipsis />} size="small" type="tertiary" />
          <LemonButton size="small" data-attr="new-canvas" type="secondary">
            New canvas
          </LemonButton>
          <LemonButton size="small" data-attr="new-notebook" type="primary">
            New notebook
          </LemonButton>
        </div>
      </div>

      {/* NotebooksTable 1-to-1 DOM & Class Hierarchy */}
      <div className="deprecated-space-y-4 flex flex-col gap-4">
        {/* Welcome Banner */}
        {showBanner && (
          <LemonBanner
            type="info"
            onClose={() => setShowBanner(false)}
          >
            <b>Welcome to Notebooks</b> - a great way to bring Insights, Replays, Feature Flags and many more PostHog products together into one place.
          </LemonBanner>
        )}

        {/* Filter Bar */}
        <div className="flex justify-between gap-2 flex-wrap items-center">
          <LemonInput
            type="search"
            placeholder="Search for notebooks"
            onChange={(e) => setSearch(e.target.value)}
            value={search}
            data-attr="notebooks-search"
          />

          <div className="flex items-center gap-4 flex-wrap text-xs">
            <div className="flex items-center gap-2">
              <span>Containing:</span>
              <LemonSelect
                size="small"
                value={selectedContains}
                onChange={(val: string) => setSelectedContains(val)}
                options={[
                  { value: '', label: 'Any content' },
                  ...Object.entries(fromNodeTypeToLabel).map(([key, label]) => ({
                    value: key,
                    label,
                  })),
                ]}
              />
            </div>
            <div className="flex items-center gap-2">
              <span>Created by:</span>
              <LemonSelect
                size="small"
                value={selectedCreator}
                onChange={(val: string) => setSelectedCreator(val)}
                options={[
                  { value: '', label: 'All members' },
                  { value: 'James Hawkins', label: 'James Hawkins' },
                  { value: 'Marius Andra', label: 'Marius Andra' },
                  { value: 'PostHog Team', label: 'PostHog Team' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Official LemonTable Implementation */}
        <LemonTable
          data-attr="notebooks-table"
          dataSource={filteredNotebooks}
          rowKey="short_id"
          columns={columns}
        />
      </div>
    </div>
  );
}
