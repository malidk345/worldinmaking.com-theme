/**
 * Bot thinking process — structured internal reasoning before public reply.
 *
 * Models are instructed to emit:
 *   <thinking>
 *     <perceive>...</perceive>
 *     <frame>...</frame>
 *     <tension>...</tension>
 *     <move>...</move>
 *   </thinking>
 *   public reply outside tags
 *
 * Fallback: legacy <thought>...</thought> or free text.
 */
import type { TaskType } from 'lib/persona-engine'
import { stripThinkingBlocks, THINKING_TAG_NAMES } from './thinking-tags'

export type ThinkingDepth = 'brief' | 'standard' | 'deep'

export interface ThinkingStage {
    id: 'perceive' | 'frame' | 'tension' | 'move' | 'raw'
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

export function usesNativeQwenReasoning(depth?: ThinkingDepth): boolean {
    return depth === 'standard' || depth === 'deep'
}

export function shouldPromptThinkingTags(depth?: ThinkingDepth): boolean {
    return !usesNativeQwenReasoning(depth)
}

/**
 * System prompt block for private reasoning + public reply.
 * Native Qwen already emits <think>; do not also demand a short <thinking> essay.
 */
export function buildThinkingInstruction(taskType: TaskType, depth?: ThinkingDepth): string {
    const d = depthForTask(taskType, depth)
    // Public style lives once in getFluidSystemPrompt — do not repeat it here.

    if (usesNativeQwenReasoning(d)) {
        return [
            'After any private reasoning, close the thinking tag and write a complete public reply the user can read.',
            'Never put the user-visible answer inside thinking tags. Never stop after reasoning.',
            'If you have no separate reasoning channel, write 40-80 words inside <thinking>...</thinking>, close the tag, then write the full public reply.',
        ].join('\n')
    }

    return [
        'THINKING PROCESS (mandatory, keep it short):',
        'Write at most 80 words inside <thinking>...</thinking>, then you MUST close the tag.',
        'After </thinking> write the full public reply. Never end inside the thinking tag. Never put the answer inside the tag.',
    ].join('\n')
}

function extractTag(block: string, tag: string): string {
    const closed = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i')
    const m = block.match(closed)
    if (m) return cleanAIOutput(m[1].trim())
    return ''
}

const STAGE_ORDER = [
    ['perceive', 'Perceive'],
    ['frame', 'Frame'],
    ['tension', 'Tension'],
    ['move', 'Move'],
] as const

/**
 * Parse stage tags even when the model omits closing tags:
 *   <perceive>…\n<frame>…\n<tension>…\n<move>…
 */
function extractStagesLoose(block: string): ThinkingStage[] {
    const stages: ThinkingStage[] = []
    for (let i = 0; i < STAGE_ORDER.length; i++) {
        const [id, label] = STAGE_ORDER[i]
        const nextId = STAGE_ORDER[i + 1]?.[0]
        const closed = extractTag(block, id)
        if (closed) {
            stages.push({ id, label, text: closed })
            continue
        }
        // open tag until next stage open tag or end
        const openRe = nextId
            ? new RegExp(`<${id}>\\s*([\\s\\S]*?)(?=<${nextId}>|<\\/thinking>|<\\/thought>|$)`, 'i')
            : new RegExp(`<${id}>\\s*([\\s\\S]*?)(?=<\\/thinking>|<\\/thought>|$)`, 'i')
        const m = block.match(openRe)
        if (m?.[1]?.trim()) {
            stages.push({ id, label, text: cleanAIOutput(m[1].trim()) })
        }
    }
    return stages
}

function stagesFromBlock(inner: string): ThinkingStage[] {
    const tagPattern = new RegExp(`</?(?:${THINKING_TAG_NAMES.join('|')})(?:\\s[^>]*)?>`, 'gi')
    const raw = cleanAIOutput(inner.replace(tagPattern, '').trim())
    if (!raw) return []

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
    options?: { providerTrace?: string }
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
        if (stray[1].trim()) stages.push(...stagesFromBlock(stray[1].trim()))
        reply = stray[3]
    }

    const closedPattern = new RegExp(
        `<(${wrapperNames.join('|')})(?:\\s[^>]*)?>\\s*([\\s\\S]*?)<\\/\\1\\s*>`,
        'gi'
    )
    let match: RegExpExecArray | null
    while ((match = closedPattern.exec(reply)) !== null) {
        stages.push(...stagesFromBlock(match[2]))
    }
    reply = reply.replace(closedPattern, '')

    const unclosedPattern = new RegExp(`<(${wrapperNames.join('|')})(?:\\s[^>]*)?>\\s*([\\s\\S]*)$`, 'i')
    const unclosed = unclosedPattern.exec(reply)
    if (unclosed) {
        // An unclosed think block is all private. Do not promote its last
        // paragraph into the public reply — that is how thinking leaked.
        stages.push(...stagesFromBlock(unclosed[2].trim()))
        reply = reply.slice(0, unclosed.index).trim()
    }

    // 4. Loose philosophical tags without a wrapping block
    if (/<perceive>/i.test(reply) || /<frame>/i.test(reply)) {
        const looseStages = extractStagesLoose(reply)
        if (looseStages.length > 0) {
            stages.push(...looseStages)
            for (const [id] of STAGE_ORDER) {
                reply = reply
                    .replace(new RegExp(`<${id}>[\\s\\S]*?(?:<\\/${id}>|$)`, 'gi'), '')
                    // In case they are adjacent and unclosed
                    .replace(new RegExp(`<${id}>[\\s\\S]*?(?=<perceive>|<frame>|<tension>|<move>|$)`, 'gi'), '')
            }
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
