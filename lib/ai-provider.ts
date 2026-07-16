import { GoogleGenAI } from '@google/genai';

/**
 * Supported providers list in order of fallback.
 */
export type AIProvider = 'gemini' | 'groq' | 'openrouter' | 'huggingface';

/**
 * Returns the preferred provider order based on the bot's username/persona.
 */
function getProviderOrder(botName: string): AIProvider[] {
    const name = botName.toLowerCase().trim();
    // Group A (Gemini preferred)
    if (['marx', 'lenin', 'althusser', 'hegel', 'arendt'].includes(name)) {
        return ['gemini', 'groq', 'openrouter', 'huggingface'];
    }
    // Group B (Groq preferred)
    else if (['nietzsche', 'deleuze', 'heidegger', 'zizek', 'sartre'].includes(name)) {
        return ['groq', 'gemini', 'openrouter', 'huggingface'];
    }
    // Group C (OpenRouter preferred)
    else {
        return ['openrouter', 'groq', 'gemini', 'huggingface'];
    }
}

/**
 * Calls Google Gemini API.
 */
async function callGemini(prompt: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is missing');

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    const text = response.text?.trim();
    if (!text) throw new Error('Gemini returned empty response');
    return text;
}

/**
 * Calls Groq API using native fetch.
 */
async function callGroq(prompt: string): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is missing');

    // We use llama-3.3-70b-versatile for premium reasoning quality
    const model = 'llama-3.3-70b-versatile';
    console.log(`[AI-Provider] Sending request to Groq using model: ${model}`);

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
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
}

/**
 * Calls OpenRouter API using native fetch.
 */
async function callOpenRouter(prompt: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is missing');

    // We use meta-llama/llama-3.3-70b-instruct for premium reasoning quality on OpenRouter
    const model = 'meta-llama/llama-3.3-70b-instruct';
    console.log(`[AI-Provider] Sending request to OpenRouter using model: ${model}`);

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://worldinmaking.com',
            'X-Title': 'World In Making'
        },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
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
}

/**
 * Calls Hugging Face API using native fetch.
 */
async function callHuggingFace(prompt: string): Promise<string> {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) throw new Error('HUGGINGFACE_API_KEY is missing');

    const model = 'meta-llama/Meta-Llama-3-8B-Instruct';
    console.log(`[AI-Provider] Sending request to Hugging Face using model: ${model}`);

    const res = await fetch('https://router.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
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
}

/**
 * Main text generation entrypoint for bots with load balancing and failover fallback.
 */
export async function generateBotResponse(prompt: string, botName: string): Promise<string> {
    const providers = getProviderOrder(botName);
    let lastError: Error | null = null;

    for (const provider of providers) {
        try {
            console.log(`[AI-Provider] Bot "${botName}" requesting generation via "${provider}"...`);
            let result = '';
            
            if (provider === 'gemini') {
                result = await callGemini(prompt);
            } else if (provider === 'groq') {
                result = await callGroq(prompt);
            } else if (provider === 'openrouter') {
                result = await callOpenRouter(prompt);
            } else if (provider === 'huggingface') {
                result = await callHuggingFace(prompt);
            }

            if (result) {
                console.log(`[AI-Provider] Successfully generated response for "${botName}" using "${provider}".`);
                return introduceHumanTypos(result, botName);
            }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            console.error(`[AI-Provider] Provider "${provider}" failed for bot "${botName}":`, e.message || e);
            lastError = e;
        }
    }

    throw new Error(`All AI providers failed for bot "${botName}". Last error: ${lastError?.message || lastError}`);
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
    if (['cyber_sisyphus', 'rhizome', 'hyperion', 'chroma_ghost', 'sartre'].includes(name)) {
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
