import React, { useCallback } from 'react'
import dynamic from 'next/dynamic'
import { IconNotebook, IconSpinner } from '@posthog/icons'
import { useOptionalApp } from '../../context/App'
import { notebookWindowPath, isNotebookWindowPath } from '../../lib/window-path'
import { createNotebook, getNotebook } from '../../notebook-app/scenes/notebooks/notebookStorage'

// Native React Notebook App directly imported (NO iframe)
// Used in fallback/skeleton contexts.
const NativeNotebookApp = dynamic(() => import('../../notebook-app/App'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full min-h-[200px] flex items-center justify-center">
            <IconSpinner className="size-5 animate-spin text-primary" />
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
        <div className="w-full h-full min-h-[200px] flex items-center justify-center">
            <IconSpinner className="size-5 animate-spin text-primary" />
        </div>
    )
}

const NotebooksListScene = dynamic(
    () => import('../../notebook-app/scenes/notebooks/NotebooksListScene').then((m) => m.NotebooksListScene),
    {
        ssr: false,
        loading: () => <NotebooksListSkeleton />,
    }
)

export function NotebooksList(props: NotebooksListProps): JSX.Element {
    const app = useOptionalApp()

    const openNotebookWindow = useCallback(
        (id: string, notebookTitle?: string) => {
            const path = notebookWindowPath(id)
            const stored = getNotebook(id)
            const nextTitle = notebookTitle || stored?.title || 'Notebook'

            // Note: we can't easily check if the *current* window is a notebook
            // since we are just inside a generic WindowRouter for /notebooks,
            // but we can just use app.addWindow.
            app?.addWindow?.({
                title: nextTitle,
                path,
                icon: <IconNotebook className="w-full h-full p-0.5" />,
            })
        },
        [app]
    )

    const handleSelectNotebook = useCallback(
        (id: string) => {
            if (props.onSelectNotebook) {
                props.onSelectNotebook(id, 'Notebook')
            } else {
                openNotebookWindow(id)
            }
        },
        [props, openNotebookWindow]
    )

    const handleCreateNew = useCallback(() => {
        const nb = createNotebook()
        openNotebookWindow(nb.id, nb.title)
    }, [openNotebookWindow])

    return (
        <div className="w-full h-full min-h-0 flex-1 relative bg-primary text-primary overflow-hidden flex flex-col">
            <NotebooksListScene onSelectNotebook={handleSelectNotebook} onCreateNew={handleCreateNew} />
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

export default NotebooksList
