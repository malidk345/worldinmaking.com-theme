/**
 * Shared Intent Classifier — WorldInMaking.com
 *
 * Heuristic first, then a temperature-0 LLM only when the query is ambiguous.
 * Shared by `/api/chat`, `/api/bots/intent.ts`, and `/api/notebook/co-author.ts`
 * so workspace chat and notebook co-author decide search the same way.
 */

import { generateWithGateway } from './ai-gateway'
import type { EnvStore } from './runtime-env'
import { SECURITY_PREAMBLE } from './orchestrate'
import {
    DEFAULT_INTENT,
    expandSearchQuery,
    extractSearchQuery,
    inferFormat,
    inferSearchIntent,
    looksLikeFollowUp,
    type IntentResult,
    type ResolvedSearchIntent,
} from './search-intent'

export type { IntentResult, ResolvedSearchIntent, SearchIntentSource } from './search-intent'
export { expandSearchQuery, extractSearchQuery, inferFormat, inferSearchIntent, looksLikeFollowUp }

const INTENT_SYSTEM_PROMPT = `You are a fast intent classifier for a philosophical AI assistant.
Your ONLY job is to analyze the user's request and output a STRICT JSON object representing what the user wants the assistant to do.

Analyze if the user explicitly asks to, or would clearly benefit from:
1. Search the web for current/real-world/factual information (internette arama yap, araştır, güncel veri, kim, ne zaman, haberler, vs.)
2. Create a To-Do list (to-do, yapılacaklar listesi, vs.)
3. Create a Plan (plan yap, yol haritası, vs.)

Output ONLY valid JSON with this exact structure, nothing else:
{
  "needsSearch": boolean,
  "searchQuery": string | null, // The core query to search if needsSearch is true
  "formatRequest": "todo" | "plan" | "none" // The requested structure
}

Do not include markdown code fences. Just the raw JSON object.`

/**
 * Force (globe on) → always search.
 * Clear heuristic → skip LLM.
 * Ambiguous → classifyIntent, falling back to the heuristic if the LLM is down.
 */
export async function resolveSearchIntent(
    question: string,
    opts?: { force?: boolean; env?: EnvStore; previousUserText?: string }
): Promise<ResolvedSearchIntent> {
    const bounded = question.trim().slice(0, 8000)
    if (!bounded) return { ...DEFAULT_INTENT, source: 'none' }
    const previousUserText = opts?.previousUserText?.trim().slice(0, 800) || ''

    if (opts?.force) {
        return {
            needsSearch: true,
            searchQuery: expandSearchQuery(bounded, previousUserText),
            formatRequest: inferFormat(bounded),
            source: 'force',
        }
    }

    const heuristic = inferSearchIntent(bounded)

    // Greetings / creative / self questions stay high-confidence no-search.
    if (heuristic.confidence === 'high' && !heuristic.needsSearch) {
        return {
            needsSearch: false,
            searchQuery: null,
            formatRequest: heuristic.formatRequest,
            source: 'heuristic',
        }
    }

    if (previousUserText && looksLikeFollowUp(bounded)) {
        const previous = inferSearchIntent(previousUserText)
        if (previous.needsSearch || heuristic.needsSearch) {
            return {
                needsSearch: true,
                searchQuery: expandSearchQuery(heuristic.searchQuery || bounded, previousUserText),
                formatRequest: heuristic.formatRequest,
                source: 'heuristic',
            }
        }
    }

    if (heuristic.confidence === 'high') {
        return {
            needsSearch: heuristic.needsSearch,
            searchQuery: heuristic.needsSearch
                ? expandSearchQuery(heuristic.searchQuery || bounded, previousUserText)
                : heuristic.searchQuery,
            formatRequest: heuristic.formatRequest,
            source: 'heuristic',
        }
    }

    try {
        const llm = await classifyIntent(bounded, opts?.env)
        if (llm.needsSearch) {
            return {
                needsSearch: true,
                searchQuery: expandSearchQuery(
                    llm.searchQuery || heuristic.searchQuery || bounded,
                    previousUserText
                ),
                formatRequest: llm.formatRequest,
                source: 'llm',
            }
        }
        if (heuristic.needsSearch) {
            return {
                needsSearch: true,
                searchQuery: expandSearchQuery(heuristic.searchQuery || bounded, previousUserText),
                formatRequest: llm.formatRequest || heuristic.formatRequest,
                source: 'heuristic',
            }
        }
        return { ...llm, source: 'llm' }
    } catch {
        return {
            needsSearch: heuristic.needsSearch,
            searchQuery: heuristic.needsSearch
                ? expandSearchQuery(heuristic.searchQuery || bounded, previousUserText)
                : heuristic.searchQuery,
            formatRequest: heuristic.formatRequest,
            source: heuristic.needsSearch ? 'heuristic' : 'none',
        }
    }
}

export async function classifyIntent(question: string, env?: EnvStore): Promise<IntentResult> {
    const boundedQuestion = question.trim().slice(0, 8000)
    if (!boundedQuestion) return DEFAULT_INTENT

    const gen = await generateWithGateway({
        systemPrompt: SECURITY_PREAMBLE + '\n\n' + INTENT_SYSTEM_PROMPT,
        userPrompt: boundedQuestion,
        taskType: 'community_reply',
        botName: 'intent_router',
        env,
        temperature: 0,
    })

    if (!gen.ok) return DEFAULT_INTENT

    try {
        let text = gen.text.trim()
        text = text.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim()

        const result = JSON.parse(text)
        return {
            needsSearch: !!result.needsSearch,
            searchQuery: typeof result.searchQuery === 'string' ? result.searchQuery.trim().slice(0, 500) || null : null,
            formatRequest: ['todo', 'plan', 'none'].includes(result.formatRequest) ? result.formatRequest : 'none',
        }
    } catch {
        return DEFAULT_INTENT
    }
}
