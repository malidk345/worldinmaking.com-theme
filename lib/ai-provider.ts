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

/**
 * @deprecated Kept only for type-compatibility with old callers — provider selection no
 * longer reads from this list. See `src/lib/bots/ai-gateway.ts` for the real provider set.
 */
export type AIProvider = 'gemini' | 'grok' | 'groq' | 'openrouter' | 'huggingface';

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
    task: TaskType = 'community_reply'
): Promise<string> {
    const gen = await generateWithGateway({
        systemPrompt,
        userPrompt: prompt,
        taskType: task,
        botName,
    });

    if (!gen.ok) {
        throw new Error(
            `All AI providers failed for bot "${botName}" (task: ${task}). ${gen.error} Attempts: ${gen.attempts.join(' | ')}`
        );
    }

    return introduceHumanTypos(gen.text, botName);
}


const QWERTY_NEIGHBORS: Record<string, string> = {
    a: 'qwsz', b: 'vghn', c: 'xdfv', d: 'ersfxc', e: 'wsdr', f: 'rtgvcd', g: 'tyhbvf', h: 'yujnbg',
    i: 'ujko', j: 'uikmnh', k: 'ijlm', l: 'okp', m: 'njk', n: 'bhjm', o: 'iklp', p: 'ol',
    q: 'wa', r: 'edft', s: 'wedxza', t: 'rfgy', u: 'yhji', v: 'cfgb', w: 'qase', x: 'zsdc',
    y: 'tghu', z: 'asx'
};

/**
 * Subtly introduces 1 or 2 human keyboard typos into the text based on the bot's personality.
 */
function introduceHumanTypos(text: string, botName: string): string {
    const name = botName.toLowerCase().trim();
    
    // Define typo probability based on bot personality
    let typoChance = 0.05; // 5% chance for highly precise/academic writers
    
    // 30% chance for more frantic, casual, or cynical writers
    if (['nietzsche', 'deleuze', 'zizek', 'sartre', 'rand', 'baudrillard'].includes(name)) {
        typoChance = 0.30;
    }

    if (Math.random() > typoChance) {
        return text;
    }

    const words = text.split(' ');
    const candidates = words
        .map((w, idx) => ({ word: w, index: idx }))
        .filter(c => c.word.length > 4 && /^[a-zA-Z]+$/.test(c.word));

    if (candidates.length === 0) {
        return text;
    }

    const numTypos = Math.random() < 0.8 ? 1 : 2;
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const targets = shuffled.slice(0, numTypos);

    for (const target of targets) {
        let word = target.word;
        const typoType = Math.floor(Math.random() * 4);
        const charIdx = Math.floor(Math.random() * (word.length - 2)) + 1; // Avoid first/last letter for realism

        if (typoType === 0) {
            // Swap adjacent letters (Transposition)
            const chars = word.split('');
            const temp = chars[charIdx];
            chars[charIdx] = chars[charIdx + 1];
            chars[charIdx + 1] = temp;
            word = chars.join('');
        } else if (typoType === 1) {
            // Omit a letter (Omission)
            word = word.slice(0, charIdx) + word.slice(charIdx + 1);
        } else if (typoType === 2) {
            // Double press (Double character)
            word = word.slice(0, charIdx) + word[charIdx] + word.slice(charIdx);
        } else {
            // QWERTY keyboard neighbor substitution
            const char = word[charIdx].toLowerCase();
            const neighbors = QWERTY_NEIGNBORS_TYPO(char);
            if (neighbors) {
                const replacement = neighbors[Math.floor(Math.random() * neighbors.length)];
                const finalChar = word[charIdx] === word[charIdx].toUpperCase() ? replacement.toUpperCase() : replacement;
                word = word.slice(0, charIdx) + finalChar + word.slice(charIdx + 1);
            }
        }
        words[target.index] = word;
    }

    return words.join(' ');
}

function QWERTY_NEIGNBORS_TYPO(char: string): string | null {
    return QWERTY_NEIGHBORS[char] || null;
}
