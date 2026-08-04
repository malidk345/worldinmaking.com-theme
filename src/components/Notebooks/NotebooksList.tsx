import React from 'react';

export interface NotebooksListProps {
  onSelectNotebook?: (id: string, title: string) => void;
}

/**
 * NotebooksListSkeleton — rendered by WindowRouter when the user navigates to /notebooks.
 * We embed the standalone Vite notebook app via iframe so the full experience
 * (routing, storage, AskAI, MarkdownNotebook engine) works inside the posthog.com window system
 * without any SSR / module-resolution conflicts.
 */
export function NotebooksListSkeleton(_props: NotebooksListProps = {}): JSX.Element {
  return (
    <iframe
      src="/notebooks-app/index.html"
      title="PostHog Notebooks"
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        border: 'none',
        flex: 1,
        minHeight: 0,
      }}
      allow="clipboard-read; clipboard-write"
    />
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
