/**
 * Legacy multi-provider entry point — now a thin compatibility shim.
 *
 * All actual provider calls, API key rotation, retry/backoff, and rate-limit cooldown
 * logic live in `src/lib/bots/ai-gateway.ts` (the single, Edge-safe gateway also used by
 * the live forum/chat bots). This file only re-exports `generateBotResponse()` with its
 * old signature so existing callers (autonomous-entities, chat-bots, wimbot-orchestrator)
 * don't need to change, while actually running through the unified gateway underneath.
 */
import type { TaskType } from './persona-engine';
import { generateWithGateway } from '../src/lib/bots/ai-gateway';
import { validateAndReturn } from './quality-gate';

/**
 * @deprecated Kept only for type-compatibility with old callers — provider selection no
 * longer reads from this list. See `src/lib/bots/ai-gateway.ts` for the real provider set.
 */
export type AIProvider = 'gemini' | 'grok' | 'groq';

/**
 * @deprecated Use buildPersonaPrompt() from persona-engine.ts instead.
 * Kept for backward compatibility with existing callers during migration.
 */
export const EDITORIAL_SYSTEM_PROMPT = `
WRITING FORMAT DIRECTIVES:
- Use **bold** for key terms and named concepts
- Use *italics* for philosophical emphasis or foreign terminology
- Use > blockquote to cite positions or counter-arguments
- Use > [!NOTE] / > [!IMPORTANT] / > [!WARNING] for structured callouts
- Separate ideas into paragraphs of 2–4 sentences max
- NEVER use: "certainly", "of course", "great question", "as an AI"
- NEVER use emojis
- Write as a specific intellectual persona, not a generic assistant
`.trim();

/**
 * @deprecated Use buildPersonaHeader() from persona-engine.ts for new code.
 * Kept for backward compatibility.
 */
export function buildBotPrompt(rawPrompt: string): string {
    return `${EDITORIAL_SYSTEM_PROMPT}\n\n---\n\n${rawPrompt}`;
}



/**
 * @deprecated Legacy entry point, kept for backward compatibility with existing callers
 * (autonomous-entities, chat-bots, wimbot-orchestrator). Delegates to the single,
 * Edge-safe multi-provider gateway in `src/lib/bots/ai-gateway.ts` — provider selection,
 * key rotation, retry/backoff, and rate-limit cooldown all happen there now.
 *
 * @param prompt       - The task-specific user prompt.
 * @param botName      - Bot username (used for provider rotation offset and typo personality).
 * @param systemPrompt - Optional persona header injected as system message.
 * @param task         - Optional task type for model selection routing.
 */
export async function generateBotResponse(
    prompt: string,
    botName: string,
    systemPrompt: string = '',
    task: TaskType = 'community_reply',
    structuredOutput = false
): Promise<string> {
    const { extractPersona } = require('./persona-engine');
    const p = extractPersona('', botName);
    const gen = await generateWithGateway({
        systemPrompt,
        userPrompt: prompt,
        taskType: task,
        botName,
        temperature: p.temperature,
    });

    if (!gen.ok) {
        throw new Error(
            `All AI providers failed for bot "${botName}" (task: ${task}). ${gen.error} Attempts: ${gen.attempts.join(' | ')}`
        );
    }

    if (structuredOutput) return gen.text.trim()

    return validateAndReturn(gen.text, p, task, {
        correctionFn: async (correctionPrompt: string) => {
            const correction = await generateWithGateway({
                systemPrompt,
                userPrompt: correctionPrompt,
                taskType: task,
                botName,
                temperature: p.temperature,
            })
            if (!correction.ok) throw new Error(correction.error)
            return correction.text
        },
    })
}
