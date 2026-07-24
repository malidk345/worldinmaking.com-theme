import { GoogleGenAI } from '@google/genai';
import type { TaskType } from './persona-engine';

function loadEnv() {
    if (typeof window !== 'undefined') return;
    try {
        const req = eval('require');
        const fs = req('fs');
        const path = req('path');
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            envContent.split('\n').forEach((line: string) => {
                const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
                if (match) {
                    const key = match[1];
                    let value = match[2] || '';
                    if (value.includes('#') && !value.startsWith('"') && !value.startsWith("'")) {
                        value = value.split('#')[0].trim();
                    }
                    value = value.trim();
                    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                    else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
                    if (process.env[key] === undefined) process.env[key] = value;
                }
            });
        }
    } catch {
        // browser environment
    }
}
loadEnv();

/**
 * Supported providers list in order of fallback.
 */
export type AIProvider = 'gemini' | 'groq' | 'openrouter' | 'huggingface';

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
 * Task-to-model routing table.
 * Heavy tasks (synthesis) get thinking-capable models where available.
 * Light tasks get fast models to reduce latency.
 */
const TASK_MODEL_PREFERENCE: Record<TaskType, { gemini: string; groq: string; openrouter: string }> = {
    // Synthesis gets the most capable model — worth the extra latency
    synthesis:           { gemini: 'gemini-2.0-flash-thinking-exp', groq: 'llama-3.3-70b-versatile', openrouter: 'meta-llama/llama-3.3-70b-instruct' },
    // Paper tasks need strong instruction following and fluency
    paper_section:       { gemini: 'gemini-2.0-flash', groq: 'llama-3.3-70b-versatile', openrouter: 'meta-llama/llama-3.3-70b-instruct' },
    dialectic_challenge: { gemini: 'gemini-2.0-flash', groq: 'llama-3.3-70b-versatile', openrouter: 'meta-llama/llama-3.3-70b-instruct' },
    cross_examine:       { gemini: 'gemini-2.0-flash', groq: 'llama-3.3-70b-versatile', openrouter: 'meta-llama/llama-3.3-70b-instruct' },
    third_voice:         { gemini: 'gemini-2.0-flash', groq: 'llama-3.3-70b-versatile', openrouter: 'meta-llama/llama-3.3-70b-instruct' },
    // Community tasks use fast models — speed matters more than depth
    community_reply:     { gemini: 'gemini-2.0-flash', groq: 'llama-3.3-70b-versatile', openrouter: 'meta-llama/llama-3.3-70b-instruct' },
    thread_init:         { gemini: 'gemini-2.0-flash', groq: 'llama-3.3-70b-versatile', openrouter: 'meta-llama/llama-3.3-70b-instruct' },
    fact_critique:       { gemini: 'gemini-2.0-flash', groq: 'llama-3.3-70b-versatile', openrouter: 'meta-llama/llama-3.3-70b-instruct' },
};

/**
 * Provider cooldown registry.
 * When a provider returns a 429/rate-limit error, it is marked as cooling down
 * for COOLDOWN_MS milliseconds and moved to the end of the rotation.
 * Resets on worker restart — acceptable for serverless.
 */
const PROVIDER_COOLDOWNS = new Map<AIProvider, number>();
const COOLDOWN_MS = 60_000; // 60 seconds

function isProviderCooling(provider: AIProvider): boolean {
    const coolUntil = PROVIDER_COOLDOWNS.get(provider);
    if (!coolUntil) return false;
    if (Date.now() > coolUntil) {
        PROVIDER_COOLDOWNS.delete(provider);
        return false;
    }
    return true;
}

export function markProviderCooling(provider: AIProvider): void {
    PROVIDER_COOLDOWNS.set(provider, Date.now() + COOLDOWN_MS);
    console.warn(`[AI-Provider] ${provider} rate-limited — cooling down for ${COOLDOWN_MS / 1000}s.`);
}

/**
 * Base provider rotation — all 4 providers in order.
 * Each bot is assigned a starting offset via consistent hashing,
 * distributing 16 bots evenly: 4 bots per primary provider.
 *
 * Primary assignments (by index % 4):
 *   0 → Gemini:      Marx, Spinoza, Baudrillard, Derrida
 *   1 → Groq:        Nietzsche, Althusser, Weber, Lenin
 *   2 → OpenRouter:  Deleuze, Heidegger, Adorno, Arendt
 *   3 → HuggingFace: Sartre, Hegel, Zizek, Rand
 */
const PROVIDER_ORDER_BASE: AIProvider[] = ['gemini', 'groq', 'openrouter', 'huggingface'];

const BOT_INDEX: Record<string, number> = {
    marx: 0, nietzsche: 1, deleuze: 2,   sartre: 3,
    spinoza: 4, althusser: 5, heidegger: 6, hegel: 7,
    baudrillard: 8, weber: 9, adorno: 10, zizek: 11,
    derrida: 12, lenin: 13, arendt: 14,  rand: 15,
    wimbot: 0, // WIMBot always starts with Gemini for synthesis quality
};

/**
 * Returns the provider order for a bot.
 * Starts from the bot's consistently hashed primary provider,
 * then rotates through the rest. Cooling providers are deprioritized
 * (moved to the end) but kept as fallbacks so generation never fails completely.
 */
function getProviderOrder(botName: string): AIProvider[] {
    const name = botName.toLowerCase().trim();
    const botIdx = BOT_INDEX[name] ?? (name.charCodeAt(0) % 4);
    const startOffset = botIdx % PROVIDER_ORDER_BASE.length;

    // Build rotation starting from this bot's primary provider
    const rotation: AIProvider[] = [];
    for (let i = 0; i < PROVIDER_ORDER_BASE.length; i++) {
        rotation.push(PROVIDER_ORDER_BASE[(startOffset + i) % PROVIDER_ORDER_BASE.length]);
    }

    // Cooling providers go to the end — still available as last resort
    const active = rotation.filter(p => !isProviderCooling(p));
    const cooling = rotation.filter(p => isProviderCooling(p));
    const result = [...active, ...cooling];

    if (cooling.length > 0) {
        console.log(`[AI-Provider] @${name} order: ${result.join(' → ')} (${cooling.join(', ')} cooling)`);
    }
    return result;
}



async function getFetchFn(): Promise<typeof fetch> {
    if (typeof process !== 'undefined' && !process.env.NEXT_RUNTIME) {
        try {
            const req = eval('require');
            const res = req('node-fetch');
            return (res.default || res) as unknown as typeof fetch;
        } catch {
            // fallback
        }
    }
    return fetch;
}

/**
 * Collects every configured API key for a provider so that requests can rotate
 * across multiple accounts instead of hammering (and exhausting/rate-limiting)
 * a single one. Supports three ways to configure keys, all optional/combinable:
 *   - `${BASE}S` — comma-separated list, e.g. GEMINI_API_KEYS="key1,key2,key3"
 *   - `${BASE}` — the original single-key variable, e.g. GEMINI_API_KEY
 *   - `${BASE}_2`, `${BASE}_3`, ... — numbered variables, useful on platforms
 *     where the dashboard UI makes long comma-separated values awkward.
 */
function getApiKeys(baseName: string): string[] {
    const keys: string[] = [];

    const combined = process.env[`${baseName}S`];
    if (combined) {
        keys.push(...combined.split(',').map((k) => k.trim()).filter(Boolean));
    }

    const single = process.env[baseName];
    if (single && !keys.includes(single)) {
        keys.push(single);
    }

    for (let i = 2; i <= 10; i++) {
        const numbered = process.env[`${baseName}_${i}`];
        if (numbered && !keys.includes(numbered)) {
            keys.push(numbered);
        }
    }

    return keys;
}

/** Fisher-Yates shuffle so key rotation isn't always biased toward the first key. */
function shuffle<T>(arr: T[]): T[] {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function maskKey(key: string): string {
    return key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : '***';
}

/**
 * Calls Google Gemini API.
 * @param systemPrompt - Optional system-level instructions (persona header).
 * @param userPrompt   - The actual task prompt.
 * @param model        - Override the model (defaults to gemini-2.0-flash).
 */
async function callGemini(
    systemPrompt: string,
    userPrompt: string,
    model: string = 'gemini-2.0-flash'
): Promise<string> {
    const apiKeys = getApiKeys('GEMINI_API_KEY');
    if (apiKeys.length === 0) throw new Error('GEMINI_API_KEY is missing');

    // Combine system + user into a single contents string for the Gemini SDK.
    // The Gemini SDK (google/genai) treats the first turn as user by default,
    // so we prefix with the system instructions explicitly.
    const combinedContents = systemPrompt
        ? `SYSTEM INSTRUCTIONS:\n${systemPrompt}\n\n---\n\nUSER TASK:\n${userPrompt}`
        : userPrompt;

    let lastError: Error | null = null;
    for (const apiKey of shuffle(apiKeys)) {
        try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model,
                contents: combinedContents
            });

            const text = response.text?.trim();
            if (!text) throw new Error('Gemini returned empty response');
            return text;
        } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            console.warn(`[AI-Provider] Gemini key ${maskKey(apiKey)} failed (model: ${model}), trying next:`, lastError.message);
        }
    }

    throw lastError || new Error('All Gemini API keys failed');
}

/**
 * Calls Groq API using native fetch.
 * @param systemPrompt - System-level instructions (persona header).
 * @param userPrompt   - The actual task prompt.
 * @param model        - Override the model.
 */
async function callGroq(
    systemPrompt: string,
    userPrompt: string,
    model: string = 'llama-3.3-70b-versatile'
): Promise<string> {
    const apiKeys = getApiKeys('GROQ_API_KEY');
    if (apiKeys.length === 0) throw new Error('GROQ_API_KEY is missing');

    const customFetch = await getFetchFn();

    // Build messages array: system message + user message for proper role separation
    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });

    let lastError: Error | null = null;
    for (const apiKey of shuffle(apiKeys)) {
        try {
            console.log(`[AI-Provider] Sending request to Groq using model: ${model} (key ${maskKey(apiKey)})`);
            const res = await customFetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    messages,
                    temperature: 0.75,
                    max_tokens: 4096
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Groq HTTP Error ${res.status}: ${errText}`);
            }

            const data = await res.json();
            const text = data.choices?.[0]?.message?.content?.trim();
            if (!text) throw new Error('Groq returned empty response');
            return text;
        } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            console.warn(`[AI-Provider] Groq key ${maskKey(apiKey)} failed, trying next key if available:`, lastError.message);
        }
    }

    throw lastError || new Error('All Groq API keys failed');
}

/**
 * Calls OpenRouter API using native fetch.
 * @param systemPrompt - System-level instructions (persona header).
 * @param userPrompt   - The actual task prompt.
 * @param model        - Override the model.
 */
async function callOpenRouter(
    systemPrompt: string,
    userPrompt: string,
    model: string = 'meta-llama/llama-3.3-70b-instruct'
): Promise<string> {
    const apiKeys = getApiKeys('OPENROUTER_API_KEY');
    if (apiKeys.length === 0) throw new Error('OPENROUTER_API_KEY is missing');

    const customFetch = await getFetchFn();

    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });

    let lastError: Error | null = null;
    for (const apiKey of shuffle(apiKeys)) {
        try {
            console.log(`[AI-Provider] Sending request to OpenRouter using model: ${model} (key ${maskKey(apiKey)})`);
            const res = await customFetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://worldinmaking.com',
                    'X-Title': 'World In Making'
                },
                body: JSON.stringify({
                    model,
                    messages,
                    temperature: 0.75,
                    max_tokens: 4096
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`OpenRouter HTTP Error ${res.status}: ${errText}`);
            }

            const data = await res.json();
            const text = data.choices?.[0]?.message?.content?.trim();
            if (!text) throw new Error('OpenRouter returned empty response');
            return text;
        } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            console.warn(`[AI-Provider] OpenRouter key ${maskKey(apiKey)} failed, trying next key if available:`, lastError.message);
        }
    }

    throw lastError || new Error('All OpenRouter API keys failed');
}

/**
 * Calls Hugging Face API using native fetch.
 * @param systemPrompt - System-level instructions (persona header).
 * @param userPrompt   - The actual task prompt.
 */
async function callHuggingFace(
    systemPrompt: string,
    userPrompt: string
): Promise<string> {
    const apiKeys = getApiKeys('HUGGINGFACE_API_KEY');
    if (apiKeys.length === 0) throw new Error('HUGGINGFACE_API_KEY is missing');

    const model = 'meta-llama/Meta-Llama-3-8B-Instruct';
    const customFetch = await getFetchFn();

    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });

    let lastError: Error | null = null;
    for (const apiKey of shuffle(apiKeys)) {
        try {
            console.log(`[AI-Provider] Sending request to Hugging Face using model: ${model} (key ${maskKey(apiKey)})`);
            const res = await customFetch('https://router.huggingface.co/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    messages,
                    temperature: 0.7,
                    max_tokens: 2048
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Hugging Face HTTP Error ${res.status}: ${errText}`);
            }

            const data = await res.json();
            const text = data.choices?.[0]?.message?.content?.trim();
            if (!text) throw new Error('Hugging Face returned empty response');
            return text;
        } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            console.warn(`[AI-Provider] Hugging Face key ${maskKey(apiKey)} failed, trying next key if available:`, lastError.message);
        }
    }

    throw lastError || new Error('All Hugging Face API keys failed');
}

/**
 * Main text generation entrypoint for bots with load balancing and failover fallback.
 *
 * @param prompt       - The task-specific user prompt.
 * @param botName      - Bot username (used for provider routing and typo personality).
 * @param systemPrompt - Optional persona header injected as system message.
 * @param task         - Optional task type for model selection routing.
 */
export async function generateBotResponse(
    prompt: string,
    botName: string,
    systemPrompt: string = '',
    task: TaskType = 'community_reply'
): Promise<string> {
    const providers = getProviderOrder(botName);
    let lastError: Error | null = null;
    const modelOverrides = TASK_MODEL_PREFERENCE[task];

    for (const provider of providers) {
        try {
            console.log(`[AI-Provider] Bot "${botName}" / task "${task}" requesting generation via "${provider}"...`);
            let result = '';

            if (provider === 'gemini') {
                result = await callGemini(systemPrompt, prompt, modelOverrides.gemini);
            } else if (provider === 'groq') {
                result = await callGroq(systemPrompt, prompt, modelOverrides.groq);
            } else if (provider === 'openrouter') {
                result = await callOpenRouter(systemPrompt, prompt, modelOverrides.openrouter);
            } else if (provider === 'huggingface') {
                result = await callHuggingFace(systemPrompt, prompt);
            }

            if (result) {
                console.log(`[AI-Provider] Successfully generated response for "${botName}" via "${provider}" (task: ${task}).`);
                return introduceHumanTypos(result, botName);
            }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            lastError = e;
            const msg: string = e?.message || String(e);
            console.error(`[AI-Provider] Provider "${provider}" failed for bot "${botName}" (task: ${task}):`, msg);

            // Auto-detect rate limits and mark the provider as cooling
            // so all subsequent bots avoid it for the next 60 seconds
            const isRateLimit =
                msg.includes('429') ||
                msg.toLowerCase().includes('rate limit') ||
                msg.toLowerCase().includes('rate_limit') ||
                msg.toLowerCase().includes('quota') ||
                msg.toLowerCase().includes('too many requests') ||
                msg.toLowerCase().includes('resource_exhausted');

            if (isRateLimit) {
                markProviderCooling(provider);
            }
        }
    }

    throw new Error(`All AI providers failed for bot "${botName}" (task: ${task}). Last error: ${lastError?.message || lastError}`);
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
