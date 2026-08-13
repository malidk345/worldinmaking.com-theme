import { PHILOSOPHER_BOTS, type TaskType } from 'lib/persona-engine'

export const BOT_MOODS = ['calm', 'passionate', 'angry', 'weary'] as const
export type BotMood = (typeof BOT_MOODS)[number]

export const BOT_ACTIONS = ['chat', 'forum_reply', 'thread_init', 'paper_step', 'status'] as const
export type ValidBotAction = (typeof BOT_ACTIONS)[number]

export const PAPER_STEPS = ['thesis', 'antithesis', 'cross_examine', 'third_voice', 'synthesis'] as const
export type ValidPaperStep = (typeof PAPER_STEPS)[number]

export const COAUTHOR_MODES = ['critique', 'expand', 'debate', 'synthesize', 'chat'] as const
export type CoauthorMode = (typeof COAUTHOR_MODES)[number]

const TASK_TYPES: readonly TaskType[] = [
    'community_reply',
    'paper_section',
    'dialectic_challenge',
    'cross_examine',
    'third_voice',
    'synthesis',
    'thread_init',
    'fact_critique',
    'autonomous_assistant',
]

const THINKING_DEPTHS = ['brief', 'standard', 'deep'] as const
export type ValidThinkingDepth = (typeof THINKING_DEPTHS)[number]

export function normalizeBotName(value: unknown, fallback?: string): string | null {
    const raw = value === undefined ? fallback : value
    if (typeof raw !== 'string' || !raw.trim()) return null

    // NFD removes accents without throwing away valid identities such as Žižek.
    const lookup = raw
        .trim()
        .replace(/^@+/, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')

    const generalAiAliases = new Set([
        'claude',
        'claude37sonnet',
        'wimsai',
        'wimsaibots',
        'generalai',
    ])
    if (generalAiAliases.has(lookup)) {
        return "wim's ai bots"
    }

    const bot = PHILOSOPHER_BOTS.find(
        (candidate) =>
            candidate.id === lookup ||
            candidate.name
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '') === lookup
    )

    // An explicitly supplied invalid bot must fail validation. Falling back here
    // silently turns typos into Nietzsche and makes audit logs misleading.
    return bot?.name || null
}

export function parseBotMood(value: unknown, fallback: BotMood = 'calm'): BotMood | null {
    if (value === undefined) return fallback
    return typeof value === 'string' && (BOT_MOODS as readonly string[]).includes(value.trim().toLowerCase())
        ? (value.trim().toLowerCase() as BotMood)
        : null
}

export function parseTaskType(value: unknown, fallback: TaskType = 'community_reply'): TaskType | null {
    if (value === undefined) return fallback
    return typeof value === 'string' && TASK_TYPES.includes(value.trim() as TaskType)
        ? (value.trim() as TaskType)
        : null
}

export function parseThinkingDepth(value: unknown): ValidThinkingDepth | null | undefined {
    if (value === undefined) return undefined
    return typeof value === 'string' && (THINKING_DEPTHS as readonly string[]).includes(value.trim())
        ? (value.trim() as ValidThinkingDepth)
        : null
}

export function parseBotAction(value: unknown, fallback: ValidBotAction = 'chat'): ValidBotAction | null {
    if (value === undefined) return fallback
    return typeof value === 'string' && (BOT_ACTIONS as readonly string[]).includes(value.trim())
        ? (value.trim() as ValidBotAction)
        : null
}

export function parsePaperStep(value: unknown, fallback: ValidPaperStep = 'thesis'): ValidPaperStep | null {
    if (value === undefined) return fallback
    return typeof value === 'string' && (PAPER_STEPS as readonly string[]).includes(value.trim())
        ? (value.trim() as ValidPaperStep)
        : null
}

export function parseCoauthorMode(value: unknown, fallback: CoauthorMode = 'critique'): CoauthorMode | null {
    if (value === undefined) return fallback
    return typeof value === 'string' && (COAUTHOR_MODES as readonly string[]).includes(value.trim())
        ? (value.trim() as CoauthorMode)
        : null
}

export function readOptionalString(value: unknown, maxLength: number): string | null | undefined {
    if (value === undefined) return undefined
    if (typeof value !== 'string') return null
    return value.trim().slice(0, maxLength)
}

export function getClientIp(req: Request): string {
    return (
        req.headers.get('cf-connecting-ip')?.trim() ||
        req.headers.get('x-real-ip')?.trim() ||
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        'local'
    )
}

export type JsonObjectResult =
    | { ok: true; body: Record<string, unknown> }
    | { ok: false; status: 400 | 413; error: string }

/** Read and validate a JSON object before any prompt field is processed. */
export async function readJsonObject(req: Request, maxBytes: number): Promise<JsonObjectResult> {
    const contentLength = Number(req.headers.get('content-length') || '')
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
        return { ok: false, status: 413, error: `Request body too large (max ${maxBytes} bytes)` }
    }

    let raw = ''
    try {
        if (req.body) {
            const reader = req.body.getReader()
            const decoder = new TextDecoder()
            let bytesRead = 0
            while (true) {
                const { value, done } = await reader.read()
                if (done) break
                bytesRead += value.byteLength
                if (bytesRead > maxBytes) {
                    await reader.cancel()
                    return { ok: false, status: 413, error: `Request body too large (max ${maxBytes} bytes)` }
                }
                raw += decoder.decode(value, { stream: true })
            }
            raw += decoder.decode()
        }
    } catch {
        return { ok: false, status: 400, error: 'Invalid request body' }
    }

    let parsed: unknown
    try {
        parsed = raw ? JSON.parse(raw) : null
    } catch {
        return { ok: false, status: 400, error: 'Request body must be valid JSON' }
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false, status: 400, error: 'Request body must be a JSON object' }
    }

    return { ok: true, body: parsed as Record<string, unknown> }
}
