/**
 * Paper pipeline step — one dialectic step per call (edge-friendly).
 * Full multi-step WIMBot factory stays in lib/wimbot-orchestrator (Node/worker later).
 */
import { runBotTurn, type ThinkingDepth } from '../orchestrate'
import { supabaseRest } from '../supabase-edge'

export type PaperStepKind =
    | 'thesis'
    | 'antithesis'
    | 'cross_examine'
    | 'third_voice'
    | 'synthesis'

const STEP_TASK: Record<PaperStepKind, 'paper_section' | 'dialectic_challenge' | 'cross_examine' | 'third_voice' | 'synthesis'> = {
    thesis: 'paper_section',
    antithesis: 'dialectic_challenge',
    cross_examine: 'cross_examine',
    third_voice: 'third_voice',
    synthesis: 'synthesis',
}

const NEXT_STATUS: Record<PaperStepKind, string> = {
    thesis: 'antithesis',
    antithesis: 'cross_examine',
    cross_examine: 'third_voice',
    third_voice: 'synthesis',
    synthesis: 'published',
}

/**
 * Run a single paper contribution from a bot.
 * payload: { paperId?, directive?, step?, previousText? }
 */
export async function runPaperStep(params: {
    botUsername: string
    question?: string
    mood?: string
    thinkingDepth?: ThinkingDepth
    step?: PaperStepKind
    paperId?: string
    directive?: string
    previousText?: string
    dryRun?: boolean
}) {
    const step: PaperStepKind = params.step || 'thesis'
    const taskType = STEP_TASK[step]
    if (!taskType) {
        return {
            success: false as const,
            error: `Invalid paper step: ${String(params.step)}`,
            action: 'paper_step' as const,
            phase: 'validation' as const,
            step: params.step,
            persisted: false,
        }
    }

    // Optionally load paper from posts table
    let paper: any = null
    let meta: any = null
    if (params.paperId) {
        const res = await supabaseRest<any[]>(
            `/posts?id=eq.${encodeURIComponent(params.paperId)}&select=id,title,content,excerpt`
        )
        if (!res.ok) {
            return {
                success: false as const,
                error: res.detail || res.error,
                action: 'paper_step' as const,
                phase: 'paper_lookup_failed' as const,
                step,
                persisted: false,
            }
        }
        if (Array.isArray(res.data) && res.data[0]) {
            paper = res.data[0]
            try {
                if (typeof paper.excerpt === 'string' && paper.excerpt.trim().startsWith('{')) {
                    meta = JSON.parse(paper.excerpt)
                }
            } catch {
                meta = null
            }
        }
        if (!paper) {
            return {
                success: false as const,
                error: `Paper ${params.paperId} not found`,
                action: 'paper_step' as const,
                phase: 'paper_missing' as const,
                step,
                persisted: false,
            }
        }
    }

    const directive =
        params.directive ||
        meta?.directive ||
        params.question ||
        paper?.title ||
        'Advance the collaborative paper one rigorous step.'

    const previous =
        params.previousText ||
        (Array.isArray(meta?.contributions)
            ? meta.contributions
                  .map((c: any) => `[@${c.bot || c.bot_username || c.username || 'unknown'}]\n${c.body || c.content || ''}`)
                  .join('\n\n---\n\n')
            : '') ||
        paper?.content ||
        ''

    const context = [
        `PAPER STEP: ${step}`,
        `DIRECTIVE: ${directive}`,
        previous ? `PRIOR CONTRIBUTIONS:\n${previous.slice(0, 6000)}` : '',
    ]
        .filter(Boolean)
        .join('\n\n')

    const llm = await runBotTurn({
        question:
            params.question ||
            `As @${params.botUsername}, write the ${step} contribution for this collaborative paper. Stay in persona; produce publishable prose.`,
        philosopher: params.botUsername,
        mood: params.mood || (step === 'antithesis' ? 'passionate' : 'calm'),
        taskType,
        thinkingDepth: params.thinkingDepth || 'deep',
        context,
    })

    if (!llm.success) {
        console.error('[paper] paper_step providers failed', {
            philosopher: llm.philosopher,
            error: llm.error,
            attempts: 'attempts' in llm ? llm.attempts : undefined,
            step,
        })
        const productReply =
            typeof llm.reply === 'string' && llm.reply.trim()
                ? llm.reply.trim()
                : 'The philosopher network is unavailable right now.'
        return {
            success: false as const,
            action: 'paper_step' as const,
            phase: 'llm_failed' as const,
            step,
            persisted: false,
            philosopher: llm.philosopher,
            reply: productReply,
            epistemicStance: llm.epistemicStance,
            code: 'PROVIDER_UNAVAILABLE' as const,
            error: 'Philosopher network unavailable',
            latencyMs: llm.latencyMs,
            taskType: llm.taskType,
        }
    }

    // Qwen's native trace may be shown to the requesting UI, but never store it
    // in collaborative paper metadata. Persist only the safe model summary.
    const persistedThinking = {
        ...llm.thinking,
        stages: llm.thinking.stages.filter((stage) => stage.source !== 'provider_trace'),
    }
    const persistedSummary = persistedThinking.stages.map((stage) => stage.text).join('\n\n').slice(0, 2000)
    const contribution = {
        bot: params.botUsername,
        step,
        body: llm.reply,
        thought: persistedSummary,
        thinking: { ...persistedThinking, summary: persistedSummary, source: persistedSummary ? 'model_summary' as const : 'none' as const },
        provider: llm.provider,
        at: new Date().toISOString(),
    }

    if (params.dryRun || !params.paperId || !paper) {
        return {
            ...llm,
            action: 'paper_step' as const,
            phase: params.dryRun ? ('dry_run' as const) : ('llm_only' as const),
            step,
            nextStatus: NEXT_STATUS[step],
            persisted: false,
            contribution,
            paperId: params.paperId || null,
            note: params.paperId
                ? 'LLM ready; set dryRun:false with a writable posts row to persist meta.'
                : 'Provide payload.paperId to attach contribution to a posts row.',
        }
    }

    // Merge contribution into excerpt JSON meta (lightweight paper factory state)
    const contributions = Array.isArray(meta?.contributions) ? [...meta.contributions, contribution] : [contribution]
    const nextMeta = {
        ...(meta || {}),
        paper_status: NEXT_STATUS[step],
        directive,
        contributions,
        contributor_sequence: [
            ...((meta?.contributor_sequence as string[]) || []),
            params.botUsername.toLowerCase(),
        ],
    }

    // Append body section to content
    const sectionHeader = `\n\n## ${step.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} — @${params.botUsername}\n\n`
    const newContent = `${paper.content || ''}${sectionHeader}${llm.reply}`

    const update = await supabaseRest(`/posts?id=eq.${encodeURIComponent(params.paperId)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
            content: newContent,
            excerpt: JSON.stringify(nextMeta),
        }),
    })

    if (!update.ok) {
        return {
            ...llm,
            action: 'paper_step' as const,
            phase: 'persist_failed' as const,
            step,
            persisted: false,
            persistError: update.detail || update.error,
            contribution,
        }
    }

    return {
        ...llm,
        action: 'paper_step' as const,
        phase: 'persisted' as const,
        step,
        nextStatus: NEXT_STATUS[step],
        persisted: true,
        contribution,
        paperId: params.paperId,
        paper_status: NEXT_STATUS[step],
    }
}
