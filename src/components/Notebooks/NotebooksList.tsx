import React from 'react'
import dynamic from 'next/dynamic'

// Native React Notebook App directly imported (NO iframe)
const NativeNotebookApp = dynamic(() => import('../../notebook-app/App'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-primary text-primary">
            <div className="text-sm font-semibold animate-pulse">Loading React Notebook Engine...</div>
        </div>
    ),
})

export interface NotebooksListProps {
    onSelectNotebook?: (id: string, title: string) => void
}

/**
 * Native React Notebooks Component — Loads the full wim native MarkdownNotebook engine
 * directly inside the OS AppWindow without any iframe.
 */
export function NotebooksListSkeleton(_props: NotebooksListProps = {}): JSX.Element {
    return (
        <div className="w-full h-full min-h-0 flex-1 relative bg-[var(--bg-3000,#f3f4f5)] overflow-hidden flex flex-col">
            <NativeNotebookApp />
        </div>
    )
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
}

export default NotebooksListSkeleton
