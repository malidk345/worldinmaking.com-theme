/**
 * Shared Intent Classifier — WorldInMaking.com
 *
 * Fast, deterministic (temperature 0) LLM classification of what a user
 * message is asking for: does it need a live web search, and/or a specific
 * output format (to-do list / plan)? Shared by `/api/bots/intent.ts` (client
 * dropdown) and `/api/notebook/co-author.ts` (Ask AI search step) so both
 * surfaces use the exact same prompt/parsing instead of two drifting copies.
 */

import { generateWithGateway } from './ai-gateway'
import type { EnvStore } from './runtime-env'
import { SECURITY_PREAMBLE } from './orchestrate'

export interface IntentResult {
    needsSearch: boolean
    searchQuery: string | null
    formatRequest: 'todo' | 'plan' | 'none'
}

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

const DEFAULT_RESULT: IntentResult = { needsSearch: false, searchQuery: null, formatRequest: 'none' }

export async function classifyIntent(question: string, env?: EnvStore): Promise<IntentResult> {
    const boundedQuestion = question.trim().slice(0, 8000)
    if (!boundedQuestion) return DEFAULT_RESULT

    const gen = await generateWithGateway({
        systemPrompt: SECURITY_PREAMBLE + '\n\n' + INTENT_SYSTEM_PROMPT,
        userPrompt: boundedQuestion,
        taskType: 'community_reply',
        botName: 'intent_router',
        env,
        temperature: 0,
    })

    if (!gen.ok) return DEFAULT_RESULT

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
        return DEFAULT_RESULT
    }
}
