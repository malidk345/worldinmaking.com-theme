import { useRouter } from 'next/router'
import React, { useState, createContext, useEffect } from 'react'
import { Replies } from './Replies'
import { Profile } from './Profile'
import { QuestionData, StrapiRecord, TopicData } from 'lib/strapi'
import LevelBadge from './LevelBadge'
import Days from './Days'
import Markdown from './Markdown'
import { QuestionForm } from './QuestionForm'
import { useQuestion } from '../hooks/useQuestion'
import QuestionSkeleton from './QuestionSkeleton'
import SubscribeButton from './SubscribeButton'
import Link from 'components/Link'
import { useUser } from 'hooks/useUser'
import {
    IconArchive,
    IconPencil,
    IconPin,
    IconTrash,
    IconUndo,
    IconShieldLock,
    IconThumbsUp,
    IconThumbsUpFilled,
    IconThumbsDown,
    IconThumbsDownFilled,
} from '@posthog/icons'
import EditWrapper from './EditWrapper'
import ReportSpamButton from './ReportSpamButton'
import OSButton from 'components/OSButton'
import { useToast } from '../../../context/Toast'
import { useWindow } from '../../../context/Window'
import { useApp } from '../../../context/App'
import { runAdminAction } from 'lib/admin-client'

type QuestionProps = {
    id?: number | string
    question?: StrapiRecord<QuestionData>
    expanded?: boolean
    showSlug?: boolean
    buttonText?: string
    showActions?: boolean
    askMax?: boolean
    onQuestionReady?: (question: StrapiRecord<QuestionData>) => void
    subscribeButton?: boolean
    isInForum?: boolean
    onPinTopics?: (topics: StrapiRecord<TopicData>[]) => void
}

export const CurrentQuestionContext = createContext<any>({})

const QuestionVoteButton = ({
    type,
    voted,
    votes,
    onClick,
}: {
    type: 'up' | 'down'
    voted: boolean
    votes: number
    onClick: () => void
}) => {
    return (
        <OSButton
            onClick={onClick}
            icon={
                type === 'up' ? (
                    voted ? (
                        <IconThumbsUpFilled className="text-white" />
                    ) : (
                        <IconThumbsUp />
                    )
                ) : voted ? (
                    <IconThumbsDownFilled className="text-white" />
                ) : (
                    <IconThumbsDown />
                )
            }
            size="md"
            className={
                type === 'up'
                    ? voted
                        ? '!bg-green !text-white !border-green'
                        : ''
                    : voted
                    ? '!bg-red !text-white !border-red'
                    : ''
            }
        >
            <strong>{votes}</strong>
        </OSButton>
    )
}

const DeleteButton = ({ questionID, onDeleted }: { questionID: number | string; onDeleted?: () => void }) => {
    const router = useRouter()
    const { addToast } = useToast()
    const [busy, setBusy] = useState(false)

    const handleClick = async () => {
        if (!confirm('Are you sure you want to delete this thread and its replies?')) return
        setBusy(true)
        try {
            await runAdminAction('delete_forum_post', { id: questionID })
            addToast({ description: 'Thread deleted' })
            onDeleted?.()
            router.push('/questions')
        } catch (error: any) {
            addToast({ description: error.message || 'Failed to delete thread', error: true })
        } finally {
            setBusy(false)
        }
    }

    return (
        <OSButton
            onClick={handleClick}
            icon={<IconTrash />}
            size="md"
            disabled={busy}
            tooltip={
                <>
                    <IconShieldLock className="size-5 relative -top-px inline-block text-secondary" /> Delete thread
                </>
            }
        />
    )
}

export function Question(props: QuestionProps) {
    const { id, question, showSlug, buttonText, showActions = true, isInForum = false, onPinTopics, ...other } = props
    const [expanded, setExpanded] = useState(props.expanded || false)
    const [isEditingQuestion, setIsEditingQuestion] = useState(false)
    const { user, notifications, setNotifications, isModerator } = useUser()
    const { addToast } = useToast()
    const { appWindow } = useWindow()
    const [maxQuestions, setMaxQuestions] = useState(
        appWindow?.location?.state?.askMax ? [{ manual: false, withContext: false }] : []
    )

    useEffect(() => {
        if (
            notifications?.length > 0 &&
            notifications.some(
                (notification) => notification.question?.id === id || notification.question?.permalink === id
            )
        ) {
            const newNotifications = notifications.filter(
                (notification) => notification.question?.id !== id && notification.question?.permalink !== id
            )
            setNotifications(newNotifications)
        }
    }, [notifications])

    // TODO: Default to question data if passed in
    const {
        question: questionData,
        isLoading,
        isError,
        error,
        reply,
        handlePublishReply,
        handleResolve,
        handleReplyDelete,
        voteReply,
        voteQuestion,
        archive,
        pinThread,
        mutate,
    } = useQuestion(id, { data: question })

    const { openSignIn } = useApp()

    const questionUpvoted = React.useMemo(
        () =>
            questionData?.attributes?.upvoteProfiles?.data?.some(
                (p: any) =>
                    (user?.id && String(p?.id) === String(user.id)) ||
                    (user?.profile?.id && String(p?.id) === String(user.profile.id))
            ) ?? false,
        [questionData?.attributes?.upvoteProfiles, user?.id, user?.profile?.id]
    )
    const questionDownvoted = React.useMemo(
        () =>
            questionData?.attributes?.downvoteProfiles?.data?.some(
                (p: any) =>
                    (user?.id && String(p?.id) === String(user.id)) ||
                    (user?.profile?.id && String(p?.id) === String(user.profile.id))
            ) ?? false,
        [questionData?.attributes?.downvoteProfiles, user?.id, user?.profile?.id]
    )
    const questionUpvotes = React.useMemo(
        () => questionData?.attributes?.upvoteProfiles?.data?.length || 0,
        [questionData?.attributes?.upvoteProfiles]
    )
    const questionDownvotes = React.useMemo(
        () => questionData?.attributes?.downvoteProfiles?.data?.length || 0,
        [questionData?.attributes?.downvoteProfiles]
    )

    const handleQuestionVote = (type: 'up' | 'down') => {
        if (!user) {
            openSignIn()
        } else {
            voteQuestion(type)
        }
    }

    useEffect(() => {
        if (questionData) {
            props.onQuestionReady?.(questionData)
        }
    }, [questionData])

    if (isLoading) {
        return <QuestionSkeleton isInForum={isInForum} />
    }

    if (isError) {
        return <div>Error: {JSON.stringify(error)}</div>
    }

    if (!questionData) {
        return null
    }

    const handleReply = async (_values, _formData, data) => {
        if (data.askMax) {
            setMaxQuestions([...maxQuestions, { manual: false, withContext: true }])
        }
    }

    const archived = !!questionData?.attributes.archived
    const pinned = !!questionData?.attributes.pinned
    const slugs = questionData?.attributes?.slugs
    const publishedAt = questionData?.attributes?.publishedAt
    const authorId = String(questionData?.attributes?.profile?.data?.id || '')
    const isQuestionAuthor =
        Boolean((user?.profile?.id && authorId === String(user.profile.id)) ||
        (user?.id && authorId === String(user.id)))

    return (
        <CurrentQuestionContext.Provider
            value={{
                question: { id, ...(questionData?.attributes ?? {}) },
                handlePublishReply,
                handleResolve,
                handleReplyDelete,
                voteReply,
                voteQuestion,
                mutate,
            }}
        >
            <div className={`text-primary min-w-0 max-w-full overflow-x-hidden ${isModerator && !publishedAt ? '' : ''}`}>
                {archived && (
                    <div
                        data-scheme="secondary"
                        className="m-4 mb-0 bg-primary border border-primary p-4 rounded text-center"
                    >
                        <p className="font-bold text-base !m-0 !p-0">The following thread has been archived.</p>
                        <p className="!text-sm !m-0 text-balance">
                            It's likely out of date, no longer relevant, or the answer has been added to our{' '}
                            <Link href="/docs">documentation</Link>.
                        </p>
                    </div>
                )}
                <div className={`flex flex-col w-full`}>
                    {!publishedAt && isModerator && (
                        <p className="font-bold text-sm m-0 mb-4 italic p-2 bg-accent border border-primary rounded">
                            This thread is unpublished and only visible to moderators
                        </p>
                    )}
                    <div
                        className={`flex items-center gap-2 w-full min-w-0 flex-wrap ${isInForum ? 'pt-5 pl-5 pr-8' : ''} ${
                            !questionData.attributes.subject && '-mb-2'
                        }`}
                    >
                        <Profile
                            profile={questionData.attributes.profile?.data}
                            className={archived ? 'opacity-50' : ''}
                        />
                        <LevelBadge points={questionData.attributes.profile?.data?.attributes?.reputation} />
                        <Days
                            created={questionData.attributes.createdAt}
                            profile={questionData.attributes.profile?.data}
                            edits={questionData.attributes.edits}
                        />
                        <div className="!ml-auto flex items-center space-x-px [&>*]:inline-flex shrink-0">
                            {isModerator && showActions && (
                                <>
                                    <OSButton
                                        onClick={async () => {
                                            try {
                                                await pinThread(!pinned)
                                                onPinTopics?.([] as any)
                                                addToast({ description: pinned ? 'Thread unpinned' : 'Thread pinned' })
                                            } catch (error: any) {
                                                addToast({ description: error.message || 'Failed to pin thread', error: true })
                                            }
                                        }}
                                        icon={<IconPin />}
                                        size="md"
                                        tooltip={
                                            <>
                                                <IconShieldLock className="size-5 relative -top-px inline-block text-secondary" />{' '}
                                                {pinned ? 'Unpin thread' : 'Pin thread'}
                                            </>
                                        }
                                    />
                                    <OSButton
                                        onClick={async () => {
                                            try {
                                                await archive(!archived)
                                                addToast({ description: archived ? 'Thread restored' : 'Thread archived' })
                                            } catch (error: any) {
                                                addToast({ description: error.message || 'Failed to archive thread', error: true })
                                            }
                                        }}
                                        icon={archived ? <IconUndo /> : <IconArchive />}
                                        size="md"
                                        tooltip={
                                            <>
                                                <IconShieldLock className="size-5 relative -top-px inline-block text-secondary" />{' '}
                                                {archived ? 'Restore thread' : 'Archive thread'}
                                            </>
                                        }
                                    />
                                    <DeleteButton questionID={questionData.id} onDeleted={() => onPinTopics?.([] as any)} />
                                </>
                            )}
                            {!isQuestionAuthor && <ReportSpamButton type="question" id={questionData.id} />}
                            {!archived && (props.subscribeButton ?? true) && (
                                <SubscribeButton contentType="question" id={questionData?.id} show={showActions} />
                            )}
                            {isQuestionAuthor && !isEditingQuestion && (
                                <OSButton
                                    onClick={() => setIsEditingQuestion(true)}
                                    icon={<IconPencil />}
                                    size="md"
                                    tooltip="Edit post"
                                />
                            )}
                        </div>
                    </div>

                    <div className={archived ? 'opacity-50' : ''}>
                        <div
                            className={`pb-4 min-w-0 max-w-full box-border ${
                                isInForum ? 'pl-5 pr-8' : 'border-l border-primary ml-5 pl-[30px]'
                            }`}
                        >
                            {questionData.attributes.subject && (
                                <h3 className="text-base font-semibold !mt-2 !mb-0 pb-1 leading-5 break-words">
                                    <Link href={`/questions/${questionData.attributes.permalink}`}
                                        className="!no-underline hover:!underline font-semibold"
                                    >
                                        {questionData.attributes.subject}
                                    </Link>
                                </h3>
                            )}
                            <EditWrapper
                                data={questionData}
                                type="question"
                                onSubmit={() => mutate()}
                                onEditingChange={setIsEditingQuestion}
                                editing={isEditingQuestion}
                            >
                                <Markdown className="question-content">{questionData.attributes.body}</Markdown>
                            </EditWrapper>

                            <div className="flex items-center gap-1 mt-3">
                                <QuestionVoteButton
                                    type="up"
                                    voted={questionUpvoted}
                                    votes={questionUpvotes}
                                    onClick={() => handleQuestionVote('up')}
                                />
                                <QuestionVoteButton
                                    type="down"
                                    voted={questionDownvoted}
                                    votes={questionDownvotes}
                                    onClick={() => handleQuestionVote('down')}
                                />
                            </div>

                            {!isEditingQuestion && showSlug && slugs?.length > 0 && slugs[0]?.slug !== '/questions' && (
                                <p className="text-xs text-secondary pb-4 mb-0 mt-2">
                                    <span>Originally posted on</span>{' '}
                                    <Link href={slugs[0]?.slug}
                                        className="text-secondary hover:underline hover:text-primary"
                                        state={{ newWindow: true }}
                                    >
                                        posthog.com{slugs[0]?.slug}
                                    </Link>
                                </p>
                            )}
                        </div>
                        <Replies expanded={expanded} setExpanded={setExpanded} isInForum={isInForum} />
                    </div>
                    <div
                        {...(isInForum && { 'data-scheme': 'primary' })}
                        className={` pb-1 relative w-full ${
                            isInForum
                                ? 'bg-primary border-t border-primary pt-4 px-4'
                                : 'ml-5 pl-8 pr-5 squeak-left-border'
                        } ${archived ? 'opacity-25' : ''}`}
                    >
                        <QuestionForm
                            archived={archived}
                            questionId={questionData.id}
                            buttonText={buttonText}
                            formType="reply"
                            reply={reply}
                            onSubmit={handleReply}
                            isInForum={isInForum}
                        />
                    </div>
                </div>
            </div>
        </CurrentQuestionContext.Provider>
    )
}
