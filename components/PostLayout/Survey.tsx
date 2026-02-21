import { DocsPageSurvey } from 'components/DocsPageSurvey'
import React from 'react'
import { usePost } from './hooks'

export default function Survey() {
    const { contentContainerClasses, filePath } = usePost()
    return (
        <div className={contentContainerClasses}>
            <DocsPageSurvey filePath={filePath} />
        </div>
    )
}
