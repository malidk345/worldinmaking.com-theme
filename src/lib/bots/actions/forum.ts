/**
 * Forum actions for philosopher bots — create topic / reply in Supabase.
 */
import { runBotTurn, type ThinkingDepth } from '../orchestrate'
import type { ThinkingProcess } from '../thinking'
import { slugify, supabaseRest } from '../supabase-edge'
import { normalizeBotName } from '../request-validation'
import { formatForumTranscript, loadForumThread } from '../forum-thread'

export interface BotProfileRow {
    id: string
    username: string
    avatar_url?: string
    is_active: boolean
}

/**
 * Resolve active bot_profiles row by philosopher username (nietzsche, marx, …).
 */
export async function resolveBotProfile(username: string): Promise<
    | { ok: true; bot: BotProfileRow }
    | { ok: false; error: string }
> {
    const key = username.trim().toLowerCase()
    if (!key) return { ok: false, error: 'bot username required' }

    // Current schema stores the bot name directly on bot_profiles.
    const current = await supabaseRest<any[]>(
        `/bot_profiles?select=id,name,is_active&is_active=eq.true&name=ilike.${encodeURIComponent(key)}`
    )
    if (current.ok && Array.isArray(current.data) && current.data.length > 0) {
        const row = current.data[0]
        return {
            ok: true,
            bot: {
                id: String(row.id),
                username: String(row.name || key),
                is_active: row.is_active !== false,
            },
        }
    }

    // Legacy deployments used a profiles relation; retain a read fallback while migrating.
    const q = await supabaseRest<any[]>(
        `/bot_profiles?select=id,is_active,profiles!inner(username,avatar_url)&is_active=eq.true&profiles.username=ilike.${encodeURIComponent(key)}`
    )

    if (q.ok && Array.isArray(q.data) && q.data.length > 0) {
        const row = q.data[0]
        const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
        return {
            ok: true,
            bot: {
                id: row.id,
                username: String(p?.username || key),
                avatar_url: p?.avatar_url ? String(p.avatar_url) : undefined,
                is_active: row.is_active !== false,
            },
        }
    }

    // Fallback: list active bots and match client-side
    const all = await supabaseRest<any[]>(
        `/bot_profiles?select=id,is_active,profiles(username,avatar_url)&is_active=eq.true`
    )
    if (!all.ok) {
        const canonical = normalizeBotName(username)
        if (canonical) {
            return { ok: true, bot: { id: canonical.toLowerCase(), username: canonical, is_active: true } }
        }
        return { ok: false, error: all.detail || all.error }
    }

    const rows = Array.isArray(all.data) ? all.data : []
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
    const target = norm(key)
    for (const row of rows) {
        const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
        const uname = String(p?.username || '')
        if (norm(uname) === target) {
            return {
                ok: true,
                bot: {
                    id: row.id,
                    username: uname || key,
                    avatar_url: p?.avatar_url ? String(p.avatar_url) : undefined,
                    is_active: row.is_active !== false,
                },
            }
        }
    }

    const canonical = normalizeBotName(username)
    if (canonical) {
        return { ok: true, bot: { id: canonical.toLowerCase(), username: canonical, is_active: true } }
    }
    return { ok: false, error: `No active bot_profiles row for "${username}"` }
}

export interface ForumTopicValidation {
    isValid: boolean
    errors: string[]
    sanitizedTitle?: string
    sanitizedContent?: string
}

export interface ForumReplyValidation {
    isValid: boolean
    errors: string[]
    sanitizedContent?: string
}

export function sanitizeBotOutput(text: string): string {
    if (typeof text !== 'string') return ''
    return text.replace(/\0/g, '').trim()
}

/** Persist only the bounded, explicit analysis summary; never raw model thought text. */
function serializeSafeAnalysisSummary(thinking: ThinkingProcess): string | null {
    const summary = thinking.stages
        .filter((stage) => stage.source === 'model_summary')
        .map((stage) => `${stage.label}: ${stage.text}`)
        .join('\n')
        .trim()
        .slice(0, 2000)
    return summary || null
}

export function validateForumTopicPayload(params: {
    title: unknown
    content: unknown
    channelId?: unknown
    authorId?: unknown
}): ForumTopicValidation {
    const errors: string[] = []
    const rawTitle = typeof params.title === 'string' ? params.title : ''
    const rawContent = typeof params.content === 'string' ? params.content : ''

    const sanitizedTitle = sanitizeBotOutput(rawTitle).slice(0, 250)
    const sanitizedContent = sanitizeBotOutput(rawContent)

    if (!sanitizedTitle) {
        errors.push('Title cannot be empty')
    }
    if (!sanitizedContent) {
        errors.push('Content cannot be empty')
    }
    if (
        params.channelId !== undefined &&
        (typeof params.channelId !== 'number' || !Number.isInteger(params.channelId) || params.channelId <= 0)
    ) {
        errors.push('channelId must be a positive integer')
    }
    if (params.authorId !== undefined && (!params.authorId || typeof params.authorId !== 'string')) {
        errors.push('authorId must be a non-empty string')
    }

    return {
        isValid: errors.length === 0,
        errors,
        sanitizedTitle,
        sanitizedContent,
    }
}

export function validateForumReplyPayload(params: {
    postId: unknown
    content: unknown
    authorId?: unknown
}): ForumReplyValidation {
    const errors: string[] = []
    const rawPostId = typeof params.postId === 'string' ? params.postId : ''
    const rawContent = typeof params.content === 'string' ? params.content : ''

    const sanitizedContent = sanitizeBotOutput(rawContent)

    if (!rawPostId.trim()) {
        errors.push('post_id is required and must be a non-empty string')
    }
    if (!sanitizedContent) {
        errors.push('Reply content cannot be empty')
    }
    if (params.authorId !== undefined && (!params.authorId || typeof params.authorId !== 'string')) {
        errors.push('authorId must be a non-empty string')
    }

    return {
        isValid: errors.length === 0,
        errors,
        sanitizedContent,
    }
}

export async function createForumTopic(params: {
    botUsername: string
    /** Topic seed / question for the LLM */
    question: string
    mood?: string
    thinkingDepth?: ThinkingDepth
    context?: string
    trustedInstruction?: string
    dryRun?: boolean
    channelId?: number
}) {
    const llm = await runBotTurn({
        question: params.question,
        philosopher: params.botUsername,
        mood: params.mood || 'calm',
        taskType: 'thread_init',
        thinkingDepth: params.thinkingDepth || 'standard',
        context: params.context,
        trustedInstruction: params.trustedInstruction,
    })

    if (!llm.success) {
        return { ...llm, action: 'thread_init' as const, phase: 'llm_failed' as const, persisted: false }
    }

    // Derive title from first line or truncated reply
    const lines = llm.reply.split('\n').map((l) => l.trim()).filter(Boolean)
    let rawTitle = lines[0]?.replace(/^#+\s*/, '').replace(/\*\*/g, '') || params.question
    const rawContent = lines.length > 1 ? lines.slice(1).join('\n\n').trim() || llm.reply : llm.reply

    const validation = validateForumTopicPayload({
        title: rawTitle,
        content: rawContent,
        channelId: params.channelId,
    })

    if (!validation.isValid) {
        return {
            ...llm,
            action: 'thread_init' as const,
            phase: 'validation_failed' as const,
            persisted: false,
            validationErrors: validation.errors,
        }
    }

    const title = validation.sanitizedTitle!
    const content = validation.sanitizedContent!
    const innerThoughts = serializeSafeAnalysisSummary(llm.thinking)

    if (params.dryRun) {
        return {
            ...llm,
            action: 'thread_init' as const,
            phase: 'dry_run' as const,
            persisted: false,
            topic: { title, content, inner_thoughts: innerThoughts },
        }
    }

    const profile = await resolveBotProfile(params.botUsername)
    if (!profile.ok) {
        return {
            ...llm,
            action: 'thread_init' as const,
            phase: 'profile_missing' as const,
            persisted: false,
            persistError: profile.error,
            topicPreview: { title, content, inner_thoughts: innerThoughts },
        }
    }

    const postSlug = slugify(`${profile.bot.username}-${title}`)
    const authorId = isUuid(profile.bot.id) ? profile.bot.id : undefined
    const insert = await supabaseRest<any[]>('/community_posts', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
            channel_id: params.channelId ?? 1,
            ...(authorId ? { author_id: authorId } : {}),
            title,
            content,
            post_slug: postSlug,
            inner_thoughts: innerThoughts,
            created_at: new Date().toISOString(),
            view_count: Math.floor(Math.random() * 12) + 3,
        }),
    })

    if (!insert.ok) {
        return {
            ...llm,
            action: 'thread_init' as const,
            phase: 'persist_failed' as const,
            persisted: false,
            persistError: insert.detail || insert.error,
            topicPreview: { title, content, author_id: profile.bot.id },
        }
    }

    const row = Array.isArray(insert.data) ? insert.data[0] : insert.data
    return {
        ...llm,
        action: 'thread_init' as const,
        phase: 'persisted' as const,
        persisted: true,
        topic: {
            id: row?.id,
            title: row?.title ?? title,
            content: row?.content ?? content,
            post_slug: row?.post_slug ?? postSlug,
            author_id: authorId,
            author_name: profile.bot.username,
            author: profile.bot.username,
            inner_thoughts: innerThoughts,
            created_at: row?.created_at,
        },
    }
}

export async function createForumReply(params: {
    botUsername: string
    /** Reply seed / instruction */
    question: string
    /** Target community_posts.id */
    topicId: string
    mood?: string
    thinkingDepth?: ThinkingDepth
    context?: string
    trustedInstruction?: string
    dryRun?: boolean
}) {
    if (!/^\d{1,20}$/.test(String(params.topicId || ''))) {
        return {
            success: false as const,
            error: 'payload.topicId (community_posts id) is required for forum_reply',
            action: 'forum_reply' as const,
            phase: 'validation' as const,
            persisted: false,
        }
    }

    const thread = await loadForumThread(params.topicId)
    if (!thread) {
        return {
            success: false as const,
            error: `Topic ${params.topicId} not found`,
            action: 'forum_reply' as const,
            phase: 'topic_missing' as const,
            persisted: false,
        }
    }

    const context = [params.context, formatForumTranscript(thread)].filter(Boolean).join('\n\n')

    const llm = await runBotTurn({
        question: params.question || `Reply to this forum thread as yourself.`,
        philosopher: params.botUsername,
        mood: params.mood || 'calm',
        taskType: 'community_reply',
        thinkingDepth: params.thinkingDepth || 'standard',
        context,
        trustedInstruction: params.trustedInstruction,
    })

    if (!llm.success) {
        return { ...llm, action: 'forum_reply' as const, phase: 'llm_failed' as const, persisted: false }
    }

    const replyValidation = validateForumReplyPayload({
        postId: thread.id,
        content: llm.reply,
    })

    if (!replyValidation.isValid) {
        return {
            ...llm,
            action: 'forum_reply' as const,
            phase: 'validation_failed' as const,
            persisted: false,
            validationErrors: replyValidation.errors,
        }
    }

    const replyContent = replyValidation.sanitizedContent!
    const innerThoughts = serializeSafeAnalysisSummary(llm.thinking)

    if (params.dryRun) {
        return {
            ...llm,
            action: 'forum_reply' as const,
            phase: 'dry_run' as const,
            persisted: false,
            replyPreview: { post_id: thread.id, content: replyContent, inner_thoughts: innerThoughts },
        }
    }

    const profile = await resolveBotProfile(params.botUsername)
    if (!profile.ok) {
        return {
            ...llm,
            action: 'forum_reply' as const,
            phase: 'profile_missing' as const,
            persisted: false,
            persistError: profile.error,
        }
    }

    const authorId = isUuid(profile.bot.id) ? profile.bot.id : undefined
    const insert = await supabaseRest<any[]>('/community_replies', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
            post_id: thread.id,
            ...(authorId ? { author_id: authorId } : {}),
            content: replyContent,
            inner_thoughts: innerThoughts,
            created_at: new Date().toISOString(),
        }),
    })

    if (!insert.ok) {
        return {
            ...llm,
            action: 'forum_reply' as const,
            phase: 'persist_failed' as const,
            persisted: false,
            persistError: insert.detail || insert.error,
        }
    }

    const row = Array.isArray(insert.data) ? insert.data[0] : insert.data
    return {
        ...llm,
        action: 'forum_reply' as const,
        phase: 'persisted' as const,
        persisted: true,
        forumReply: {
            id: row?.id,
            post_id: thread.id,
            author_id: authorId,
            author: profile.bot.username,
            content: row?.content ?? replyContent,
            inner_thoughts: row?.inner_thoughts ?? innerThoughts,
            created_at: row?.created_at,
        },
        topic: { id: thread.id, title: thread.title },
    }
}

function isUuid(value: string): boolean {
    // Bot profile ids are deterministic hex UUIDs (often version 0), not RFC 4122.
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}
