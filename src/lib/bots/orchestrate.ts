/**
 * Bot orchestrator — persona + thinking process + AI gateway.
 * Single entry for chat and future act handlers.
 */
import {
    extractPersona,
    buildPersonaHeader,
    type BotPersona,
    type TaskType,
} from 'lib/persona-engine'
import { generateWithGateway, type GatewayProvider } from './ai-gateway'
import {
    buildThinkingInstruction,
    parseThinkingAndReply,
    type ThinkingDepth,
    type ThinkingProcess,
} from './thinking'
import { getProviderKeyFlags, getRuntimeEnv } from './runtime-env'

export type BotAction = 'chat' | 'forum_reply' | 'thread_init' | 'paper_step' | 'status'

export interface BotRunInput {
    question: string
    philosopher?: string
    mood?: string
    taskType?: TaskType
    thinkingDepth?: ThinkingDepth
    /** Optional extra context (forum post body, paper excerpt, etc.) */
    context?: string
}

export interface BotRunSuccess {
    success: true
    philosopher: string
    epistemicStance: string
    /** Public reply only */
    reply: string
    /** Flattened thought (backward compatible with Ask AI UI) */
    thought: string
    /** Structured thinking process */
    thinking: ThinkingProcess
    provider: GatewayProvider
    confident: true
    latencyMs: number
    taskType: TaskType
    persona: Pick<BotPersona, 'name' | 'epistemicStance' | 'writingStyle'>
}

export interface BotRunFailure {
    success: false
    philosopher: string
    epistemicStance: string
    reply: string
    thought: string
    thinking: ThinkingProcess
    provider: 'none'
    confident: false
    error: string
    host: 'cloudflare-pages-edge'
    configured: ReturnType<typeof getProviderKeyFlags>
    attempts: string[]
    latencyMs: number
    taskType: TaskType
}

export type BotRunResult = BotRunSuccess | BotRunFailure

function buildUserPrompt(input: BotRunInput, taskType: TaskType): string {
    const parts = [`TASK TYPE: ${taskType}`]
    if (input.context?.trim()) {
        parts.push(`CONTEXT:\n${input.context.trim()}`)
    }
    parts.push(`QUESTION / TOPIC:\n${input.question}`)
    parts.push(
        'Provide your response adhering strictly to your epistemic stance, thinking-process format, and style rules.'
    )
    return parts.join('\n\n')
}

/**
 * Full bot turn: persona header + thinking instruction → gateway → parse.
 */
export async function runBotTurn(input: BotRunInput): Promise<BotRunResult> {
    const philosopher = input.philosopher || 'Nietzsche'
    const mood = input.mood || 'calm'
    const taskType: TaskType = input.taskType || 'community_reply'
    const runtimeEnv = getRuntimeEnv()
    const persona = extractPersona('', philosopher)

    const systemPrompt = [
        buildPersonaHeader(persona, mood),
        buildThinkingInstruction(taskType, input.thinkingDepth),
    ].join('\n\n')

    const userPrompt = buildUserPrompt(input, taskType)

    const gen = await generateWithGateway({
        systemPrompt,
        userPrompt,
        taskType,
        env: runtimeEnv,
    })

    if (!gen.ok) {
        const emptyThinking: ThinkingProcess = {
            summary: '',
            stages: [],
            structured: false,
            depth: input.thinkingDepth || 'standard',
        }
        const anyConfigured =
            gen.configured.groq ||
            gen.configured.openrouter ||
            gen.configured.openai ||
            gen.configured.gemini

        return {
            success: false,
            philosopher: persona.name,
            epistemicStance: persona.epistemicStance,
            reply: anyConfigured
                ? 'The philosopher network is unavailable right now (provider error).'
                : 'The philosopher network cannot see API keys on this Cloudflare deployment.',
            thought: '',
            thinking: emptyThinking,
            provider: 'none',
            confident: false,
            error: gen.error,
            host: 'cloudflare-pages-edge',
            configured: gen.configured,
            attempts: gen.attempts,
            latencyMs: gen.latencyMs,
            taskType,
        }
    }

    const { thinking, reply } = parseThinkingAndReply(gen.text, taskType, input.thinkingDepth)

    return {
        success: true,
        philosopher: persona.name,
        epistemicStance: persona.epistemicStance,
        reply:
            reply ||
            cleanFallbackReply(gen.text),
        thought: thinking.summary,
        thinking,
        provider: gen.provider,
        confident: true,
        latencyMs: gen.latencyMs,
        taskType,
        persona: {
            name: persona.name,
            epistemicStance: persona.epistemicStance,
            writingStyle: persona.writingStyle,
        },
    }
}

function cleanFallbackReply(raw: string): string {
    return raw
        .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
        .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
        .trim()
}

/**
 * Lightweight status for /api/bots/act action=status
 */
export function getBotSystemStatus() {
    const env = getRuntimeEnv()
    const configured = getProviderKeyFlags(env)
    const hasSupabase = !!(env.NEXT_PUBLIC_SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY))
    return {
        success: true,
        host: 'cloudflare-pages-edge' as const,
        configured,
        supabase: {
            ready: hasSupabase,
            serviceRole: !!env.SUPABASE_SERVICE_ROLE_KEY,
        },
        actions: ['chat', 'forum_reply', 'thread_init', 'paper_step', 'status'] as BotAction[],
        thinking: {
            stages: ['perceive', 'frame', 'tension', 'move'],
            depths: ['brief', 'standard', 'deep'],
        },
        paperSteps: ['thesis', 'antithesis', 'cross_examine', 'third_voice', 'synthesis'],
        ready: configured.openrouter || configured.groq || configured.gemini || configured.openai,
        notes: {
            forum_reply: 'Requires payload.topicId; persists to community_replies',
            thread_init: 'Creates community_posts as bot author',
            paper_step: 'payload.step + optional paperId; dryRun supported',
            auth: 'Mutating actions accept x-cron-secret when CRON_SECRET is set',
        },
    }
}
