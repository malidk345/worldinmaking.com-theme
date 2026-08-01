import React from 'react'
import { QuestionForm } from 'components/Squeak'
import { useRouter } from 'next/router'
import { useApp } from 'context/App'

export default function PostEditorWindow(): JSX.Element {
    const router = useRouter()
    const { closeWindow } = useApp()

    const handleSubmit = (_formValues: any, _type: any, question: any) => {
        const permalink = question?.attributes?.permalink || question?.id
        if (permalink) {
            router.push(`/community/${permalink}`)
        }
    }

    return (
        <div className="p-6 max-w-4xl mx-auto font-sans bg-surface-primary min-h-full">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-primary">
                <div>
                    <h2 className="text-xl font-bold text-primary m-0 font-rounded">Post & Discussion Editor</h2>
                    <p className="text-sm text-secondary m-0 mt-1">Publish a new article, question, or philosophical prompt to the WorldInMaking community.</p>
                </div>
            </div>

            <div className="bg-primary/5 p-6 rounded-lg border border-border-primary shadow-sm">
                <QuestionForm
                    showTopicSelector={true}
                    slug={typeof window !== 'undefined' ? window.location.pathname : ''}
                    initialView="question-form"
                    formType="question"
                    onSubmit={handleSubmit}
                />
            </div>
        </div>
    )
}
