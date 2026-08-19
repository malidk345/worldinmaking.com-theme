import React from 'react'
import SEO from 'components/seo'
import { NotebooksListSkeleton } from 'components/Notebooks/NotebooksList'

export default function NotebooksPage() {
    return (
        <div className="w-full h-full min-h-0 flex-1 flex flex-col relative overflow-hidden bg-primary">
            <SEO title="notebooks" description="markdown notebooks on worldinmaking." />
            <NotebooksListSkeleton />
        </div>
    )
}
