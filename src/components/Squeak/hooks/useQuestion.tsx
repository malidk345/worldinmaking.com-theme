import { QuestionData, StrapiRecord } from 'lib/strapi'
import { useUser } from 'hooks/useUser'
import usePostHog from 'hooks/usePostHog'
import {
    postSupabaseCommunityReply,
    fetchSupabaseCommunityPosts,
    fetchSupabaseCommunityReplies,
    formatSupabaseCommunityToStrapi,
} from 'lib/supabaseCommunity'
import { setReplyVote, setCommunityPostVote } from 'lib/wim-user-data'
import { getSessionAccessToken } from 'lib/wim-auth'
import { runAdminAction } from 'lib/admin-client'
import { clearSupabaseCache } from 'lib/supabase-rest'
import { useState, useEffect, useCallback } from 'react'

type UseQuestionOptions = {
    data?: StrapiRecord<QuestionData>
}

function mapReplies(replies: any[], includeHidden: boolean) {
    return replies
        .filter((r) => includeHidden || !r.is_hidden)
        .map((r) => {
        const pObj = Array.isArray(r.profiles) ? (r.profiles as any)[0] : r.profiles
        const votes = Array.isArray(r.community_reply_votes) ? r.community_reply_votes : []
        const upvoteProfiles = votes
            .filter((v: any) => v.vote === 1)
            .map((v: any) => ({ id: v.user_id }))
        const downvoteProfiles = votes
            .filter((v: any) => v.vote === -1)
            .map((v: any) => ({ id: v.user_id }))
        return {
            id: r.id,
            attributes: {
                id: r.id,
                body: r.content,
                createdAt: r.created_at,
                publishedAt: r.is_hidden ? null : r.created_at,
                profile: {
                    data: {
                        id: pObj?.id || r.author_id || 'community',
                        attributes: {
                            username: pObj?.username || '',
                            firstName: pObj?.username || 'Community Member',
                            lastName: '',
                            gravatarURL:
                                pObj?.avatar_url ||
                                'https://res.cloudinary.com/dmukukwp6/image/upload/posthog.com/src/pages-content/images/hog-9.png',
                        },
                    },
                },
                upvoteProfiles: { data: upvoteProfiles },
                downvoteProfiles: { data: downvoteProfiles },
            },
        }
    })
}

export const useQuestion = (id: number | string | undefined, options?: UseQuestionOptions) => {
    const { fetchUser, user } = useUser()
    const posthog = usePostHog()
    const [questionData, setQuestionData] = useState<StrapiRecord<QuestionData> | undefined>(options?.data)
    const [isLoading, setIsLoading] = useState(!options?.data && !!id)

    const load = useCallback(async () => {
        if (!id) {
            setQuestionData(options?.data)
            setIsLoading(false)
            return
        }
        setIsLoading(true)
        try {
            const cleanId = String(id).replace(/^\/questions\/?/, '')
            const posts = await fetchSupabaseCommunityPosts(cleanId, cleanId)
            const found =
                posts && posts.length > 0
                    ? posts.find((p) => String(p.id) === cleanId) || posts[0]
                    : null

            if (found) {
                const formatted = formatSupabaseCommunityToStrapi(found as any)
                const replies = await fetchSupabaseCommunityReplies(found.id)
                if (replies?.length) {
                    const includeHidden = user?.role?.type === 'moderator'
                    formatted.attributes.replies.data = mapReplies(replies, includeHidden) as any
                    formatted.attributes.numReplies = replies.filter((r) => includeHidden || !r.is_hidden).length
                }
                setQuestionData(formatted as any)
            } else if (options?.data) {
                setQuestionData(options.data)
            } else {
                setQuestionData(undefined)
            }
        } catch (e) {
            console.warn('[useQuestion]', e)
            setQuestionData(options?.data)
        } finally {
            setIsLoading(false)
        }
    }, [id, options?.data, user?.role?.type])

    useEffect(() => {
        void load()
    }, [load])

    const mutate = async (optimistic?: any, _revalidate?: boolean) => {
        if (optimistic) {
            setQuestionData(optimistic)
            return
        }
        await load()
    }

    const questionID = questionData?.id ?? id

    const reply = async (body: string) => {
        try {
            posthog?.capture('wim reply start', { questionId: questionID })

            if (questionData) {
                const now = new Date().toISOString()
                const optimisticReply = {
                    id: Date.now(),
                    attributes: {
                        body,
                        createdAt: now,
                        updatedAt: now,
                        publishedAt: now,
                        profile: {
                            data: user?.profile
                                ? { id: user.profile.id, attributes: user.profile }
                                : null,
                        },
                        upvoteProfiles: { data: [] },
                        downvoteProfiles: { data: [] },
                    },
                }
                setQuestionData({
                    ...questionData,
                    attributes: {
                        ...questionData.attributes,
                        replies: {
                            data: [...(questionData.attributes.replies?.data || []), optimisticReply],
                        },
                    },
                } as any)
            }

            const targetPostId = questionData?.id || questionID || id
            if (!targetPostId) throw new Error('Missing question id')

            const result = await postSupabaseCommunityReply(targetPostId, body)
            if (!result.ok) throw new Error(result.error || 'Reply failed — are you signed in?')

            posthog?.capture('wim reply', { questionId: questionID, replyId: result.id })
            await fetchUser()
            await load()
            window.setTimeout(() => {
                void load()
            }, 16000)
            return { data: { id: result.id, attributes: { body } } }
        } catch (error) {
            posthog?.capture('wim error', {
                source: 'useQuestion.reply',
                questionId: questionID,
                error: JSON.stringify(error),
            })
            await load()
            throw error
        }
    }

    const voteReply = async (replyId: number, type: 'up' | 'down') => {
        const userId = user?.id || user?.profile?.id
        if (!userId) return

        // Optimistic UI update
        if (questionData?.attributes?.replies?.data) {
            const updatedReplies = questionData.attributes.replies.data.map((r: any) => {
                if (r.id !== replyId) return r
                const currentUp = (r.attributes?.upvoteProfiles?.data || []).map((p: any) => String(p.id))
                const currentDown = (r.attributes?.downvoteProfiles?.data || []).map((p: any) => String(p.id))
                const uidStr = String(userId)
                const isCurrentlyUp = currentUp.includes(uidStr)
                const isCurrentlyDown = currentDown.includes(uidStr)

                let nextUp = currentUp.filter((pId: string) => pId !== uidStr)
                let nextDown = currentDown.filter((pId: string) => pId !== uidStr)

                if (type === 'up' && !isCurrentlyUp) {
                    nextUp.push(uidStr)
                } else if (type === 'down' && !isCurrentlyDown) {
                    nextDown.push(uidStr)
                }

                return {
                    ...r,
                    attributes: {
                        ...r.attributes,
                        upvoteProfiles: { data: nextUp.map((pId: string) => ({ id: pId })) },
                        downvoteProfiles: { data: nextDown.map((pId: string) => ({ id: pId })) },
                    },
                }
            })
            setQuestionData({
                ...questionData,
                attributes: {
                    ...questionData.attributes,
                    replies: { data: updatedReplies },
                },
            } as any)
        }

        try {
            await setReplyVote(replyId, type)
        } catch (e) {
            console.error('[voteReply] failed:', e)
        }
        clearSupabaseCache()
        await load()
    }

    const voteQuestion = async (type: 'up' | 'down') => {
        const userId = user?.id || user?.profile?.id
        if (!userId) return

        const targetPostId = questionData?.id || questionID || id
        if (!targetPostId) return

        if (questionData?.attributes) {
            const currentUp = (questionData.attributes.upvoteProfiles?.data || []).map((p: any) => String(p.id))
            const currentDown = (questionData.attributes.downvoteProfiles?.data || []).map((p: any) => String(p.id))
            const uidStr = String(userId)
            const isCurrentlyUp = currentUp.includes(uidStr)
            const isCurrentlyDown = currentDown.includes(uidStr)

            let nextUp = currentUp.filter((pId: string) => pId !== uidStr)
            let nextDown = currentDown.filter((pId: string) => pId !== uidStr)

            if (type === 'up' && !isCurrentlyUp) {
                nextUp.push(uidStr)
            } else if (type === 'down' && !isCurrentlyDown) {
                nextDown.push(uidStr)
            }

            setQuestionData({
                ...questionData,
                attributes: {
                    ...questionData.attributes,
                    upvoteProfiles: { data: nextUp.map((pId: string) => ({ id: pId })) },
                    downvoteProfiles: { data: nextDown.map((pId: string) => ({ id: pId })) },
                },
            } as any)
        }

        try {
            await setCommunityPostVote(targetPostId, type)
        } catch (e) {
            console.error('[voteQuestion] failed:', e)
        }
        clearSupabaseCache()
        await load()
    }

    const handlePublishReply = async (published: boolean, replyId: number) => {
        await runAdminAction('hide_forum_reply', { id: replyId, hidden: published })
        await load()
    }

    const handleResolve = async (resolved: boolean, replyId?: number | null) => {
        const token = await getSessionAccessToken()
        if (!token) throw new Error('Sign in to mark a solution')
        const res = await fetch('/api/forum/resolve', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                postId: questionID,
                replyId: resolved ? replyId ?? null : null,
            }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Failed to update solution')
        await load()
    }

    const handleReplyDelete = async (replyId: number) => {
        await runAdminAction('delete_forum_reply', { id: replyId })
        await load()
    }

    const archive = async (nextArchived: boolean) => {
        await runAdminAction('archive_forum_post', { id: questionID, archived: nextArchived })
        await load()
    }

    const pinThread = async (nextPinned: boolean) => {
        await runAdminAction('pin_forum_post', { id: questionID, pinned: nextPinned })
        await load()
    }

    const handleTopicChange = async (_topic: any) => {
        /* topics are channels on WIM */
    }

    return {
        question: questionData,
        isLoading,
        isValidating: isLoading,
        error: undefined,
        reply,
        handlePublishReply,
        handleResolve,
        handleReplyDelete,
        archive,
        pinThread,
        mutate,
        voteReply,
        voteQuestion,
        handleTopicChange,
        isModerator: user?.role?.type === 'moderator',
    }
}
