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

export type ThinkingDepth = 'brief' | 'standard' | 'deep'

export interface ThinkingStage {
    id: 'perceive' | 'frame' | 'tension' | 'move' | 'raw'
    label: string
    text: string
}

export interface ThinkingProcess {
    /** Flattened thought for simple UI / DB */
    summary: string
    stages: ThinkingStage[]
    /** true if structured tags were present */
    structured: boolean
    depth: ThinkingDepth
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
    return cleaned.replace(/\n{3,}/g, '\n\n').trim()
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

/**
 * System prompt block that forces a multi-step thinking process.
 */
export function buildThinkingInstruction(taskType: TaskType, depth?: ThinkingDepth): string {
    const d = depthForTask(taskType, depth)

    const lengthHint =
        d === 'brief'
            ? 'Keep each stage to 1–2 short sentences.'
            : d === 'deep'
              ? 'Each stage may be 2–5 sentences; show real dialectical work.'
              : 'Each stage 1–3 sentences.'

    return `
THINKING PROCESS (mandatory before any public reply):
You must reason privately inside <thinking>...</thinking> using these four stages, in order:

1. <perceive> — What is actually being said or asked? Quote or paraphrase the core claim without spinning it yet.
2. <frame> — Through your epistemic stance, how does this land? What kind of problem is this for you?
3. <tension> — Where is the contradiction, blind spot, or pressure point? What would a weak reply ignore?
4. <move> — What rhetorical / philosophical move will your public reply make? (e.g. reverse, ground in material, diagnose bad faith)

${lengthHint}
Do NOT put the public answer inside <thinking>. After </thinking>, write only the public reply in your voice.
Never mention that you are following a "thinking process" or stages in the public reply.
Never use AI-assistant filler.

Legacy fallback: if you cannot use nested tags, wrap the whole private reasoning in a single <thought>...</thought> block, then the public reply.
`.trim()
}

function extractTag(block: string, tag: string): string {
    const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i')
    const m = block.match(re)
    return m ? cleanAIOutput(m[1].trim()) : ''
}

/**
 * Parse model output into thinking process + public reply.
 */
export function parseThinkingAndReply(
    rawText: string,
    taskType: TaskType = 'community_reply',
    depth?: ThinkingDepth
): { thinking: ThinkingProcess; reply: string } {
    const d = depthForTask(taskType, depth)
    const text = rawText || ''

    // Structured <thinking>...</thinking>
    const thinkingMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/i)
    if (thinkingMatch) {
        const inner = thinkingMatch[1]
        const stages: ThinkingStage[] = (
            [
                ['perceive', 'Perceive', extractTag(inner, 'perceive')],
                ['frame', 'Frame', extractTag(inner, 'frame')],
                ['tension', 'Tension', extractTag(inner, 'tension')],
                ['move', 'Move', extractTag(inner, 'move')],
            ] as const
        )
            .filter(([, , t]) => !!t)
            .map(([id, label, t]) => ({ id, label, text: t }))

        // If nested stages missing, use whole thinking body as raw
        if (stages.length === 0) {
            const raw = cleanAIOutput(inner)
            if (raw) {
                stages.push({ id: 'raw', label: 'Thought', text: raw })
            }
        }

        const reply = cleanAIOutput(text.replace(/<thinking>[\s\S]*?<\/thinking>/i, '').trim())
        const summary = stages.map((s) => s.text).join('\n\n')

        return {
            thinking: { summary, stages, structured: stages.some((s) => s.id !== 'raw'), depth: d },
            reply,
        }
    }

    // Legacy <thought>...</thought>
    const thoughtMatch = text.match(/<thought>([\s\S]*?)<\/thought>/i)
    if (thoughtMatch) {
        const summary = cleanAIOutput(thoughtMatch[1].trim())
        const reply = cleanAIOutput(text.replace(/<thought>[\s\S]*?<\/thought>/i, '').trim())
        return {
            thinking: {
                summary,
                stages: summary ? [{ id: 'raw', label: 'Thought', text: summary }] : [],
                structured: false,
                depth: d,
            },
            reply,
        }
    }

    // No tags — entire body is public reply
    return {
        thinking: { summary: '', stages: [], structured: false, depth: d },
        reply: cleanAIOutput(text),
    }
}

export function thinkingDepthForTask(taskType: TaskType, override?: ThinkingDepth): ThinkingDepth {
    return depthForTask(taskType, override)
}
