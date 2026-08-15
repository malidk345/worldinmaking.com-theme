import React from 'react'
import { Question } from './Question'
import { QuestionForm } from './QuestionForm'
import { useQuestions } from 'hooks/useQuestions'
import HourglassLoader from 'components/HourglassLoader'

type QuestionsProps = {
    slug?: string
    limit?: number
    profileId?: number | string
    topicId?: number
    showForm?: boolean
    title?: string
    parentName?: string
    buttonText?: React.ReactNode | string
    subject?: boolean
    initialView?: string
    disclaimer?: boolean
    autoFocus?: boolean
    noQuestionsMessage?: React.ReactNode
    className?: string
}

export const Questions = ({
    className = '',
    slug,
    limit,
    topicId,
    profileId,
    showForm = true,
    title,
    parentName,
    buttonText,
    subject,
    initialView,
    disclaimer,
    autoFocus,
    noQuestionsMessage,
}: QuestionsProps) => {
    const { questions, fetchMore, refresh, isLoading, isLoadingMore, hasMore } = useQuestions({
        slug,
        limit,
        topicId,
        profileId,
    })
    const hasQuestions = questions.data && questions.data.length > 0
    return (
        <div className={className}>
            {isLoading && <HourglassLoader title="Loading discussions..." />}
            {hasQuestions && title && <h3>{title}</h3>}
            {hasQuestions && (
                <ul className="not-prose m-0 p-0 list-none mb-6">
                    {questions.data.map((question) => {
                        return (
                            <li key={question.id} className="py-4 first:pt-0">
                                <Question id={question.id} question={question} />
                            </li>
                        )
                    })}
                </ul>
            )}
            {!isLoading && !hasQuestions && noQuestionsMessage}
            {hasMore && !isLoading && (
                <div className="mb-4">
                    {isLoadingMore ? (
                        <HourglassLoader title="Loading more discussions..." />
                    ) : (
                        <button
                            type="button"
                            className="text-sm font-semibold underline text-secondary hover:text-primary"
                            onClick={() => void fetchMore()}
                        >
                            Load more
                        </button>
                    )}
                </div>
            )}

            {/*start + limit < count && (
                    <button disabled={loading} className="squeak-show-more-questions-button" onClick={fetchMore}>
                        Show more
                    </button>
                )*/}

            {/* TODO: Pass refresh for now questions */}
            {showForm && (
                <QuestionForm
                    autoFocus={autoFocus}
                    buttonText={buttonText}
                    parentName={parentName}
                    initialView={initialView}
                    onSubmit={refresh}
                    formType="question"
                    slug={slug}
                    subject={subject}
                    disclaimer={disclaimer}
                />
            )}
        </div>
    )
}
