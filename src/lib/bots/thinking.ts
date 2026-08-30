/**
 * Bot thinking process — structured internal reasoning before public reply.
 *
 * Models emit <thinking> with three persona-specific stage tags
 * (see thinking-schemas.ts), then the public reply outside.
 */
import type { TaskType } from 'lib/persona-engine'
import { stripThinkingBlocks, THINKING_TAG_NAMES } from './thinking-tags'
import {
    repertoireFor,
} from './thinking-schemas'

export type ThinkingDepth = 'brief' | 'standard' | 'deep'

export interface ThinkingStage {
    id: string
    label: string
    text: string
    source?: 'model_summary' | 'provider_trace' | 'system_event'
}

export interface ThinkingProcess {
    /** Flattened thought for simple UI / DB */
    summary: string
    stages: ThinkingStage[]
    /** true if structured tags were present */
    structured: boolean
    depth: ThinkingDepth
    source?: 'model_summary' | 'provider_trace' | 'system_event' | 'none'
}

const FORBIDDEN_AI_WORDS = [
    'certainly',
    'of course',
    'absolutely',
    'great question',
    'excellent point',
    'as an ai',
    'i must note',
    'it is worth noting',
    'it is important to note',
    'fascinating',
    "i'd be happy to",
    "i'm here to",
    "let's explore",
    'in conclusion',
    'to summarize',
    'in summary',
    'in essence',
    'needless to say',
    'it goes without saying',
]

export function cleanAIOutput(text: string): string {
    if (!text) return ''
    let cleaned = text
    for (const word of FORBIDDEN_AI_WORDS) {
        cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), '')
    }
    return cleaned.trim()
}

function depthForTask(taskType: TaskType, override?: ThinkingDepth): ThinkingDepth {
    if (override) return override
    switch (taskType) {
        case 'community_reply':
        case 'thread_init':
            return 'brief'
        case 'synthesis':
        case 'paper_section':
        case 'third_voice':
            return 'deep'
        default:
            return 'standard'
    }
}

/** Native provider reasoning is off — it burns Groq's 8k TPM. We prompt a short tag instead. */
export function usesNativeQwenReasoning(_depth?: ThinkingDepth): boolean {
    return false
}

export function shouldPromptThinkingTags(_depth?: ThinkingDepth): boolean {
    return true
}

export function thinkingCueFor(name?: string): string {
    const schema = repertoireFor(name)
    if (!schema) return 'Decide the one cut this mind would take on this case.'
    return schema.moves.map((move) => move.hint).join(' ')
}

function normalizeClause(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9çğıöşü]+/gi, ' ').replace(/\s+/g, ' ').trim()
}

const PERSONA_NAMES =
    'marx|nietzsche|hegel|sartre|heidegger|deleuze|spinoza|baudrillard|althusser|derrida|weber|adorno|zizek|zizek|lenin|arendt|rand'
const MODEL_ID_RE = /\b(qwen\/[\w.-]+|groq\/[\w.-]+|gemini-[\w.-]+|gpt-oss[\w.-]*|llama-[\w.-]+|qwen3(?:\.6)?-27b)\b/gi

/** Keep only the clause. Drop model ids, "as Marx", leftover markup. */
export function cleanStageText(text: string): string {
    let value = String(text || '')
        .replace(/<\/?[^>]+>/g, ' ')
        .replace(MODEL_ID_RE, ' ')
        .replace(/^\s*(as|you are|speaking as|writing as)\s+[a-z][a-z .'-]{1,40}\s*[:—,-]\s*/i, '')
        .replace(new RegExp(`^\\s*(?:${PERSONA_NAMES})\\s*[:—,-]\\s*`, 'i'), '')
        .replace(/\s+/g, ' ')
        .trim()
    if (/^[.…]+$/.test(value)) return ''
    if (value.length < 8 && new RegExp(`^(?:${PERSONA_NAMES})$`, 'i').test(value)) return ''
    return value
}

export function isJunkThought(text: string): boolean {
    const value = cleanStageText(text)
    if (!value) return true
    if (value.length < 8) return true
    const clause = normalizeClause(value)
    if (/^(thinking|thought|analyzing|native reasoning)$/.test(clause)) return true
    if (new RegExp(`^(?:${PERSONA_NAMES})(?:\\s+\\S+){0,2}$`, 'i').test(clause)) return true
    return false
}

/**
 * Short prompted <thinking> with this mind's three stages.
 * Outer tag is always <thinking> so the live ticker still works.
 */
export function buildThinkingInstruction(
    _taskType: TaskType,
    _depth?: ThinkingDepth,
    philosopher?: string,
): string {
    const rep = repertoireFor(philosopher)
    if (rep) {
        const movesList = rep.moves.map((m) => `[${m.tag}]`).join(', ')
        return [
            'THINKING PROCESS (mandatory): Your first characters MUST be <think>.',
            `Freely select cognitive moves from your repertoire (${movesList}) and label them with single-word brackets like ${rep.moves.slice(0, 3).map(m => `[${m.tag}]`).join(', ')}.`,
            'Ground each selected move in concrete details of the topic. Be radically honest — never flatter, pander, or use empty rhetoric. Close </think> before writing your visible reply.',
            "Reply in the user's language.",
        ].join('\n')
    }

    return [
        'THINKING PROCESS (mandatory): Your first characters MUST be <think>.',
        'Freely explore the question inside <think> with concrete analysis. Be radically honest and avoid empty rhetoric before closing with </think>.',
        "Reply in the user's language.",
    ].join('\n')
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractTag(block: string, tag: string): string {
    const closed = new RegExp(`<${escapeRegExp(tag)}>([\\s\\S]*?)<\\/${escapeRegExp(tag)}>`, 'i')
    const m = block.match(closed)
    if (m) return cleanAIOutput(m[1].replace(/^[.…\s]+|[.…\s]+$/g, '').trim())
    return ''
}

const LEGACY_STAGE_ORDER = [
    ['perceive', 'Perceive'],
    ['frame', 'Frame'],
    ['tension', 'Tension'],
    ['move', 'Move'],
] as const

function extractAnyKnownStages(block: string): ThinkingStage[] {
    const found: ThinkingStage[] = []
    const legacyIds = LEGACY_STAGE_ORDER.map(s => s[0])
    for (const id of legacyIds) {
        const text = extractTag(block, id)
        if (text) found.push({ id, label: LEGACY_STAGE_ORDER.find(s => s[0] === id)?.[1] || id, text })
    }
    if (found.length) return found
    const stages: ThinkingStage[] = []
    for (const [id, label] of LEGACY_STAGE_ORDER) {
        const text = extractTag(block, id)
        if (text) stages.push({ id, label, text })
    }
    return stages
}

function stagesFromInner(inner: string, _philosopher?: string): ThinkingStage[] {
    return stagesFromBlock(inner)
}

function stagesFromBlock(inner: string): ThinkingStage[] {
    const tagPattern = new RegExp(`</?(?:${THINKING_TAG_NAMES.join('|')})(?:\\s[^>]*)?>`, 'gi')
    const raw = cleanAIOutput(inner.replace(tagPattern, '').trim())
    if (!raw) return []

    // 1. Check for bracketed cognitive tags like [GÜÇ-OKUMASI], [GENEALOJİ], [FİZYOLOJİ], etc.
    const bracketRegex = /(?:^|\n|\s*)\[([A-ZÇĞİÖŞÜa-zçğıöşü0-9\-_ /]+)\]\s*[:—\-]?\s*([\s\S]*?)(?=(?:\n\s*\[[A-ZÇĞİÖŞÜa-zçğıöşü0-9\-_ /]+\]|$))/g
    const bracketMatches = Array.from(raw.matchAll(bracketRegex))
    if (bracketMatches.length >= 1) {
        const stages: ThinkingStage[] = []
        let idx = 1
        for (const m of bracketMatches) {
            const label = m[1].trim()
            const text = m[2].trim()
            if (text) {
                stages.push({
                    id: `repertoire-${idx++}`,
                    label,
                    text,
                })
            }
        }
        if (stages.length) return stages
    }

    // Split by multiple newlines to create natural chunks
    const paragraphs = raw.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
    if (paragraphs.length <= 1) {
        return [{ id: 'raw', label: 'Thought', text: raw }]
    }

    const stages: ThinkingStage[] = []
    let stepCount = 1

    for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i]
        const lower = p.toLowerCase()
        let label = 'Thinking'

        // Heuristic keyword matching to trigger correct icons in ThinkingBlock.tsx
        if (i === 0) {
            label = 'Analyzing'
        } else if (lower.includes('wait') || lower.includes('however') || lower.includes('but') || lower.includes('tension') || lower.includes('contradiction')) {
            label = 'Evaluating Tension'
        } else if (lower.includes('search') || lower.includes('find') || lower.includes('look up') || lower.includes('reference') || lower.includes('source')) {
            label = 'Searching'
        } else if (lower.includes('structure') || lower.includes('document') || lower.includes('write') || lower.includes('code')) {
            label = 'Structuring'
        } else if (i === paragraphs.length - 1) {
            label = 'Concluding'
        } else {
            label = 'Reflecting'
        }

        stages.push({
            id: `auto-${stepCount++}` as any,
            label,
            text: p
        })
    }

    return stages
}

/**
 * Parse model output into thinking process + public reply.
 */
export function parseThinkingAndReply(
    rawText: string,
    taskType: TaskType = 'community_reply',
    depth?: ThinkingDepth,
    options?: { providerTrace?: string; philosopher?: string }
): { thinking: ThinkingProcess; reply: string } {
    const d = depthForTask(taskType, depth)
    const text = rawText || ''
    
    let stages: ThinkingStage[] = []
    let reply = text

    // Route every known wrapper through the same parser. The stream demux uses
    // this exact grammar, so a tag variant cannot leak only during live output.
    const wrapperNames = ['analysis_summary', 'thinking', 'think', 'thought', 'reasoning', 'analysis', 'reflection', 'internal']

    // leftover reasoning</think>Public — no opening tag, prefix is private.
    const strayClosePattern = new RegExp(
        `^([\\s\\S]*?)</(${wrapperNames.join('|')})\\s*>([\\s\\S]*)$`,
        'i'
    )
    const openBeforeClose = new RegExp(`<(${wrapperNames.join('|')})(?:\\s[^>]*)?>`, 'i')
    const stray = strayClosePattern.exec(reply)
    if (stray && !openBeforeClose.test(stray[1])) {
        if (stray[1].trim()) stages.push(...stagesFromInner(stray[1].trim(), options?.philosopher))
        reply = stray[3]
    }

    const closedPattern = new RegExp(
        `<(${wrapperNames.join('|')})(?:\\s[^>]*)?>\\s*([\\s\\S]*?)<\\/\\1\\s*>`,
        'gi'
    )
    let match: RegExpExecArray | null
    while ((match = closedPattern.exec(reply)) !== null) {
        stages.push(...stagesFromInner(match[2], options?.philosopher))
    }
    reply = reply.replace(closedPattern, '')

    const unclosedPattern = new RegExp(`<(${wrapperNames.join('|')})(?:\\s[^>]*)?>\\s*([\\s\\S]*)$`, 'i')
    const unclosed = unclosedPattern.exec(reply)
    if (unclosed) {
        // An unclosed think block is all private. Do not promote its last
        // paragraph into the public reply — that is how thinking leaked.
        stages.push(...stagesFromInner(unclosed[2].trim(), options?.philosopher))
        reply = reply.slice(0, unclosed.index).trim()
    }

    const loose = extractAnyKnownStages(reply)
    if (loose.length > 0) {
        stages.push(...loose)
        for (const stage of loose) {
            reply = reply.replace(new RegExp(`<${stage.id}>[\\s\\S]*?(?:<\\/${stage.id}>|$)`, 'gi'), '')
        }
    }

    // Do not run cleanAIOutput on the public reply — it deletes filler
    // words mid-sentence and makes answers look cut off.
    reply = stripThinkingBlocks(reply.trim())

    // Parse Provider Trace (Native Reasoning from API) if available, so it appears in UI seamlessly
    if (options?.providerTrace && options.providerTrace.trim()) {
        const traceStages = stagesFromBlock(options.providerTrace.trim())
        stages.unshift(...traceStages)
    }

    const summary = stages.map((s) => s.text).join('\n\n')
    const structured = stages.some((s) => s.id !== 'raw')

    return {
        thinking: { summary, stages, structured, depth: d },
        reply: reply || '',
    }
}

export function thinkingDepthForTask(taskType: TaskType, override?: ThinkingDepth): ThinkingDepth {
    return depthForTask(taskType, override)
}
