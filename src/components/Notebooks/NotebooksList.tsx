import React, { useState } from 'react';
import { NotebooksListApp } from '../posthog-ui-gallery/src/scenes/NotebooksListApp';
import { TextOnlyNotebookApp } from '../posthog-ui-gallery/src/scenes/TextOnlyNotebookApp';

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

export interface NotebooksListProps {
  onSelectNotebook?: (id: string, title: string) => void;
}

export function NotebooksListSkeleton({ onSelectNotebook }: NotebooksListProps = {}): JSX.Element {
  const [selectedNotebook, setSelectedNotebook] = useState<{ id: string; title: string } | null>(null);

  if (selectedNotebook) {
    return (
      <TextOnlyNotebookApp
        initialTitle={selectedNotebook.title}
        onBack={() => setSelectedNotebook(null)}
      />
    );
  }

  return (
    <NotebooksListApp
      onSelectNotebook={(id, title) => {
        if (onSelectNotebook) {
          onSelectNotebook(id, title);
        }
        setSelectedNotebook({ id, title });
      }}
    />
  );
}

export default NotebooksListSkeleton;
