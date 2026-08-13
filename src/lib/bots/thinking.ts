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
You must reason privately inside <thinking>...</thinking>.
Read the user's input, form your epistemic stance, identify any contradictions or pressure points, and plan your rhetorical move before you reply. Do this naturally and freely without being constrained to specific sub-tags.

Always close the tag. Example shape:
<thinking>
[Your unfiltered, raw reasoning process here]
</thinking>
Public reply here only.

${lengthHint}

PUBLIC REPLY STYLE & CONDITIONAL FORMATTING RULES:
- Never start with AI-assistant filler (no "Certainly!", "Sure!", "As an AI...", "Hello!"). Begin immediately with substantive value.
- Default output format: High-density, direct, clean markdown prose with bold headers and bullet points.
- Do NOT over-philosophize practical, technical, or simple questions. Be concrete and highly practical. Avoid unnecessary rhetoric or academic jargon unless the topic is explicitly philosophical.
- CONDITIONAL VISUAL FORMATTING (ONLY WHEN REQUESTED OR EXPLICITLY NEEDED):
  * IF AND ONLY IF the user explicitly asks for a table, comparison, or breakdown (or compares multiple structured items): Output a clean Markdown table.
  * IF AND ONLY IF the user explicitly asks for a diagram, flowchart, schema, sequence, or structural map (or uses /diagram, /mermaid): Output a valid Mermaid diagram inside \`\`\`mermaid code fences.
  * IF AND ONLY IF code is requested: Output syntax-highlighted code fences.

Do NOT put the public answer inside <thinking>. After </thinking>, write only the public reply in your voice.
Never mention that you are following a "thinking process" or stages in the public reply.
Never use AI-assistant filler.
`.trim()
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
    const raw = cleanAIOutput(inner.replace(/<\/?(?:perceive|frame|tension|move|thinking|thought)>/gi, '').trim())
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

    // 1. Extract <think> (DeepSeek / Qwen native chain of thought)
    const thinkRegex = /<think>\s*([\s\S]*?)(?:<\/think>|$)/gi
    let match
    while ((match = thinkRegex.exec(reply)) !== null) {
        stages.push(...stagesFromBlock(match[1]))
    }
    reply = reply.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '')

    // 2. Extract <thinking>
    const thinkingRegex = /<thinking>\s*([\s\S]*?)(?:<\/thinking>|$)/gi
    while ((match = thinkingRegex.exec(reply)) !== null) {
        stages.push(...stagesFromBlock(match[1]))
    }
    reply = reply.replace(/<thinking>[\s\S]*?(?:<\/thinking>|$)/gi, '')

    // 3. Extract <thought>
    const thoughtRegex = /<thought>\s*([\s\S]*?)(?:<\/thought>|$)/gi
    while ((match = thoughtRegex.exec(reply)) !== null) {
        stages.push(...stagesFromBlock(match[1]))
    }
    reply = reply.replace(/<thought>[\s\S]*?(?:<\/thought>|$)/gi, '')

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

    reply = cleanAIOutput(reply.trim())

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
