import React from 'react';

export interface NotebooksListProps {
  onSelectNotebook?: (id: string, title: string) => void;
}

/**
 * NotebooksListSkeleton — Embedded standalone Vite notebook application.
 * Fills 100% of the host container/window viewport smoothly without clipping or layout cuts.
 */
export function NotebooksListSkeleton(_props: NotebooksListProps = {}): JSX.Element {
  return (
    <div className="w-full h-full min-h-0 flex-1 relative bg-primary overflow-hidden">
      <iframe
        src="/notebooks-app/index.html"
        title="PostHog Notebooks"
        className="w-full h-full border-none block absolute inset-0"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          outline: 'none',
        }}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}

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

export default NotebooksListSkeleton;
