import { QuestionData, StrapiRecord } from 'lib/strapi'
import { useUser } from 'hooks/useUser'
import usePostHog from 'hooks/usePostHog'
import {
    postSupabaseCommunityReply,
    fetchSupabaseCommunityPosts,
    fetchSupabaseCommunityReplies,
    formatSupabaseCommunityToStrapi,
} from 'lib/supabaseCommunity'
import { setReplyVote } from 'lib/wim-user-data'
import { useState, useEffect, useCallback } from 'react'

type UseQuestionOptions = {
    data?: StrapiRecord<QuestionData>
}

function mapReplies(replies: any[]) {
    return replies.map((r) => {
        const pObj = Array.isArray(r.profiles) ? (r.profiles as any)[0] : r.profiles
        return {
            id: r.id,
            attributes: {
                id: r.id,
                body: r.content,
                createdAt: r.created_at,
                publishedAt: r.created_at,
                profile: {
                    data: {
                        id: pObj?.id || r.author_id || 'community',
                        attributes: {
                            firstName: pObj?.username || 'Community Member',
                            lastName: '',
                            gravatarURL:
                                pObj?.avatar_url ||
                                'https://res.cloudinary.com/dmukukwp6/image/upload/posthog.com/src/pages-content/images/hog-9.png',
                        },
                    },
                },
                upvoteProfiles: { data: [] },
                downvoteProfiles: { data: [] },
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
                    formatted.attributes.replies.data = mapReplies(replies) as any
                    formatted.attributes.numReplies = replies.length
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
    }, [id, options?.data])

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
        if (!user?.profile?.id) return
        await setReplyVote(replyId, type)
        // optimistic UI already complex; reload
        await load()
    }

    const handlePublishReply = async (_published: boolean, _replyId: number) => {
        /* moderation: no Squeak publish state on WIM */
    }

    const handleResolve = async (_resolved: boolean, _replyId?: number | null) => {
        /* resolve flag not on community_posts yet */
    }

    const handleReplyDelete = async (_id: number) => {
        /* delete via supabase later */
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
        mutate,
        voteReply,
        handleTopicChange,
        isModerator: user?.role?.type === 'moderator',
    }
}
