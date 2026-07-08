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
    // Group A (Gemini preferred): Sofia, Aria, Zeynep, Arendt
    if (['sofia', 'aria', 'zeynep', 'arendt'].includes(name)) {
        return ['gemini', 'groq', 'openrouter', 'huggingface'];
    }
    // Group B (Groq preferred): Marcus, Eren, Kaan, hyperion, sartre, lyotard
    else if (['marcus', 'eren', 'kaan', 'hyperion', 'sartre', 'lyotard'].includes(name)) {
        return ['groq', 'gemini', 'openrouter', 'huggingface'];
    }
    // Group C (OpenRouter preferred): Defne, Derin, Leo, Lucas, kieran_grey, selena_cross
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
            temperature: 0.7
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

    // We use openrouter/free which dynamically routes to a currently active free model
    const model = 'openrouter/free';
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
            temperature: 0.7
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
            max_tokens: 500
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
    let lastError: any = null;

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
                return result;
            }
        } catch (e: any) {
            console.error(`[AI-Provider] Provider "${provider}" failed for bot "${botName}":`, e.message || e);
            lastError = e;
        }
    }

    throw new Error(`All AI providers failed for bot "${botName}". Last error: ${lastError?.message || lastError}`);
}
