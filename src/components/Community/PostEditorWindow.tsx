import React, { useEffect, useState } from 'react'
import { QuestionForm } from 'components/Squeak'
import { useRouter } from 'next/router'
import { useApp } from 'context/App'

export default function PostEditorWindow(): JSX.Element {
    const router = useRouter()
    const { closeWindow } = useApp()
    const [initialValues, setInitialValues] = useState<{ subject: string; body: string } | null>(null)

    useEffect(() => {
        const loadDraft = () => {
            const draft = sessionStorage.getItem('wim_forum_topic_draft_v1')
            if (draft) {
                try {
                    const parsed = JSON.parse(draft)
                    setInitialValues({
                        subject: parsed.title || '',
                        body: parsed.content || '',
                    })
                    sessionStorage.removeItem('wim_forum_topic_draft_v1')
                } catch (e) {
                    // Ignore parse error
                }
            }
        }

        loadDraft()

        const handleDraftEvent = (e: any) => {
            if (e.detail) {
                setInitialValues({
                    subject: e.detail.title || '',
                    body: e.detail.content || '',
                })
            }
        }

        window.addEventListener('wimForumCreateTopicDraft', handleDraftEvent)
        return () => window.removeEventListener('wimForumCreateTopicDraft', handleDraftEvent)
    }, [])

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
                    initialView="question-form"
                    formType="question"
                    onSubmit={handleSubmit}
                    initialValues={initialValues}
                />
            </div>
        </div>
    )
}
