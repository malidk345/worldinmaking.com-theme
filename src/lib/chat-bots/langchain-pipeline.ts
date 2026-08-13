/**
 * LangChain & LangGraph Ecosystem Pipeline — WorldInMaking.com
 *
 * Integrates open-source LangChain & LangGraph packages:
 *   - `@langchain/core`: LCEL Prompt Templates & Output Parsers
 *   - `@langchain/groq`: Groq openai/gpt-oss-120b (reasoning, 120B, free tier)
 *   - `@langchain/google-genai`: Google Gemini 2.0 Flash integration
 *   - `@langchain/langgraph`: Stateful Multi-Agent Graph & Checkpointing
 */

import { ChatGroq } from '@langchain/groq';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { loadMemGPTState, extractAndPersistMemoryFacts } from './memgpt-engine';
import { getFluidSystemPrompt } from '../bots/fluid-prompts';
import { envFrom, getRuntimeEnv } from '../bots/runtime-env';

/**
 * 1. Initializes a LangChain LLM model instance for a specific API key and model ID.
 */
export function createLangChainModelWithKey(provider: 'groq' | 'gemini', apiKey: string, modelOverride?: string, temperature?: number) {
    const t = temperature ?? 0.6;
    if (provider === 'groq') {
        return new ChatGroq({
            apiKey,
            model: modelOverride || 'qwen/qwen3.6-27b',
            temperature: t,
            maxTokens: 2048,
            maxRetries: 0,
        });
    }
    return new ChatGoogleGenerativeAI({
        apiKey,
        model: modelOverride || 'gemini-2.0-flash',
        temperature: t,
        maxRetries: 0,
    });
}

/**
 * Executes an LLM invocation with automatic key rotation and model fallback.
 * If Key #1 hits rate limit (429) or error, automatically retries with Key #2, Key #3, etc.
 * Accepts direct systemPrompt & userPrompt strings or messages array to avoid ChatPromptTemplate brace errors.
 */
export async function invokeWithKeyRotation(params: {
    systemPrompt?: string;
    userPrompt?: string;
    messages?: Array<[string, string]>;
    prompt?: any;
    temperature?: number;
}): Promise<{ reply: string; usedKeyIndex: number; provider: string }> {
    const env = getRuntimeEnv();
    const rawGroqKey = envFrom(env, 'GROQ_API_KEYS', 'GROQ_API_KEY', 'GROQ_KEYS', 'GROQ_KEY');
    const rawGeminiKey = envFrom(env, 'GEMINI_API_KEYS', 'GEMINI_API_KEY', 'GEMINI_KEYS', 'GEMINI_KEY', 'GOOGLE_API_KEY');

    const groqKeys = rawGroqKey.split(',').map(k => k.trim()).filter(Boolean);
    const geminiKeys = rawGeminiKey.split(',').map(k => k.trim()).filter(Boolean);

    // Prepare direct messages array
    const messagesInput = params.messages || (
        params.systemPrompt && params.userPrompt
            ? [['system', params.systemPrompt], ['user', params.userPrompt]]
            : null
    );

    const shuffledGroq = [...groqKeys].sort(() => Math.random() - 0.5);

    const runCall = async (model: any) => {
        if (messagesInput) {
            const chain = model.pipe(new StringOutputParser());
            return await chain.invoke(messagesInput);
        } else if (params.prompt) {
            const chain = params.prompt.pipe(model).pipe(new StringOutputParser());
            return await chain.invoke({});
        }
        throw new Error('No input prompt provided to invokeWithKeyRotation');
    };

    // Step 1: Try Qwen reasoning model on all Groq keys in sequence
    for (let i = 0; i < shuffledGroq.length; i++) {
        try {
            const model = createLangChainModelWithKey('groq', shuffledGroq[i], 'qwen/qwen3.6-27b', params.temperature);
            const reply = await runCall(model);
            if (reply && typeof reply === 'string' && reply.trim()) {
                return { reply, usedKeyIndex: i + 1, provider: 'groq:qwen' };
            }
        } catch (err: any) {
            console.warn(`[KeyRotation] Groq Key #${i + 1} failed for qwen/qwen3.6-27b:`, err?.message || err);
        }
    }

    // Step 2: Try Llama 3.3 70B fallback model across all Groq keys
    for (let i = 0; i < shuffledGroq.length; i++) {
        try {
            const model = createLangChainModelWithKey('groq', shuffledGroq[i], 'llama-3.3-70b-versatile', params.temperature);
            const reply = await runCall(model);
            if (reply && typeof reply === 'string' && reply.trim()) {
                return { reply, usedKeyIndex: i + 1, provider: 'groq:llama-fallback' };
            }
        } catch (err: any) {
            console.warn(`[KeyRotation] Groq Key #${i + 1} failed for llama-3.3-70b-versatile:`, err?.message || err);
        }
    }

    // Step 3: Try Gemini keys if all Groq keys failed
    for (let i = 0; i < geminiKeys.length; i++) {
        try {
            const model = createLangChainModelWithKey('gemini', geminiKeys[i], 'gemini-2.0-flash', params.temperature);
            const reply = await runCall(model);
            if (reply && typeof reply === 'string' && reply.trim()) {
                return { reply, usedKeyIndex: i + 1, provider: 'gemini-fallback' };
            }
        } catch (err: any) {
            console.warn(`[KeyRotation] Gemini Key #${i + 1} failed for gemini-2.0-flash:`, err?.status, err?.message);
        }
    }

    // Step 4: Try OpenRouter (if key exists)
    const openRouterKey = envFrom(env, 'OPENROUTER_API_KEY', 'OPENROUTER_KEY');
    if (openRouterKey && messagesInput) {
        try {
            const orMessages = messagesInput.map(m => ({ role: m[0], content: m[1] }));
            const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openRouterKey}`,
                    'HTTP-Referer': 'http://localhost:3000',
                },
                body: JSON.stringify({
                    model: 'qwen/qwen-2.5-72b-instruct',
                    messages: orMessages,
                    temperature: params.temperature ?? 0.6,
                })
            });
            if (orRes.ok) {
                const data = await orRes.json();
                if (data.choices?.[0]?.message?.content) {
                    return { reply: data.choices[0].message.content, usedKeyIndex: 0, provider: 'openrouter:qwen-2.5-72b' };
                }
            }
        } catch (err) {
            console.warn('[KeyRotation] OpenRouter failed:', err);
        }
    }

    throw new Error('All LLM API keys and model fallbacks exhausted.');
}

/**
 * Executes an LLM stream invocation with automatic key rotation and model fallback.
 */
export async function invokeStreamWithKeyRotation(params: {
    systemPrompt?: string;
    userPrompt?: string;
    messages?: Array<[string, string]>;
    temperature?: number;
}): Promise<{ stream: AsyncGenerator<string, void, unknown>; provider: string }> {
    const env = getRuntimeEnv();
    const rawGroqKey = envFrom(env, 'GROQ_API_KEYS', 'GROQ_API_KEY', 'GROQ_KEYS', 'GROQ_KEY');
    const rawGeminiKey = envFrom(env, 'GEMINI_API_KEYS', 'GEMINI_API_KEY', 'GEMINI_KEYS', 'GEMINI_KEY', 'GOOGLE_API_KEY');

    const groqKeys = rawGroqKey.split(',').map(k => k.trim()).filter(Boolean);
    const geminiKeys = rawGeminiKey.split(',').map(k => k.trim()).filter(Boolean);

    const messagesInput = params.messages || (
        params.systemPrompt && params.userPrompt
            ? [['system', params.systemPrompt], ['user', params.userPrompt]]
            : null
    );

    if (!messagesInput) throw new Error('No input messages provided to invokeStreamWithKeyRotation');

    const runStreamCall = async (model: any) => {
        const chain = model.pipe(new StringOutputParser());
        const stream = await chain.stream(messagesInput);
        
        // Peek the first chunk to force API execution and catch errors (e.g. 429 Rate Limit) immediately
        const iterator = stream[Symbol.asyncIterator]();
        const firstChunk = await iterator.next();
        
        if (firstChunk.done) {
            async function* empty() {}
            return empty();
        }
        
        const reassembledStream = async function* () {
            yield firstChunk.value;
            while (true) {
                const nextChunk = await iterator.next();
                if (nextChunk.done) break;
                yield nextChunk.value;
            }
        };
        
        return reassembledStream();
    };

    const shuffledGroq = [...groqKeys].sort(() => Math.random() - 0.5);

    // Step 1: Try Qwen reasoning model (Primary)
    for (let i = 0; i < shuffledGroq.length; i++) {
        try {
            const model = createLangChainModelWithKey('groq', shuffledGroq[i], 'qwen/qwen3.6-27b', params.temperature);
            const stream = await runStreamCall(model);
            return { stream, provider: 'groq:qwen' };
        } catch (err: any) {
            console.warn(`[KeyRotation Stream] Groq Key #${i + 1} failed for qwen/qwen3.6-27b:`, err?.message || err);
        }
    }

    // Step 2: Try Llama 3.3 fallback
    for (let i = 0; i < shuffledGroq.length; i++) {
        try {
            const model = createLangChainModelWithKey('groq', shuffledGroq[i], 'llama-3.3-70b-versatile', params.temperature);
            const stream = await runStreamCall(model);
            return { stream, provider: 'groq:llama-3.3' };
        } catch (err: any) {
            console.warn(`[KeyRotation Stream] Groq Key #${i + 1} failed for llama-3.3-70b-versatile:`, err?.message || err);
        }
    }

    // Step 3: Try Gemini fallback
    for (let i = 0; i < geminiKeys.length; i++) {
        try {
            const model = createLangChainModelWithKey('gemini', geminiKeys[i], 'gemini-2.0-flash', params.temperature);
            const stream = await runStreamCall(model);
            return { stream, provider: 'gemini-fallback' };
        } catch (err: any) {
            console.warn(`[KeyRotation Stream] Gemini Key #${i + 1} failed:`, err?.message || err);
        }
    }

    // Step 4: Try OpenRouter (if key exists) - Bypasses Groq's strict 8000 TPM limit!
    const openRouterKey = envFrom(env, 'OPENROUTER_API_KEY', 'OPENROUTER_KEY');
    if (openRouterKey) {
        try {
            // Convert messagesInput to OpenAI format
            const orMessages = messagesInput.map(m => ({ role: m[0], content: m[1] }));
            
            const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openRouterKey}`,
                    'HTTP-Referer': 'http://localhost:3000',
                },
                body: JSON.stringify({
                    model: 'qwen/qwen-2.5-72b-instruct',
                    messages: orMessages,
                    stream: true,
                    temperature: params.temperature ?? 0.6,
                    max_tokens: 4000
                })
            });

            if (orRes.ok && orRes.body) {
                const stream = async function* () {
                    const reader = orRes.body!.getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) break;
                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';
                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
                                try {
                                    const parsed = JSON.parse(trimmed.slice(6));
                                    if (parsed.choices?.[0]?.delta?.content) {
                                        yield parsed.choices[0].delta.content;
                                    }
                                } catch (e) {}
                            }
                        }
                    }
                }();
                return { stream, provider: 'openrouter:qwen-2.5-72b' };
            } else {
                console.warn('[KeyRotation] OpenRouter returned error status:', orRes.status);
            }
        } catch (err: any) {
            console.warn('[KeyRotation] OpenRouter failed:', err?.message || err);
        }
    }

    throw new Error('All Groq, Gemini and OpenRouter keys failed or rate limited');
}

/**
 * Backward-compatible model factory
 */
export function createLangChainModel(preferredProvider: 'groq' | 'gemini' = 'groq', temperature?: number) {
    const env = getRuntimeEnv();
    const rawKey = preferredProvider === 'gemini'
        ? envFrom(env, 'GEMINI_API_KEYS', 'GEMINI_API_KEY', 'GEMINI_KEYS', 'GEMINI_KEY', 'GOOGLE_API_KEY')
        : envFrom(env, 'GROQ_API_KEYS', 'GROQ_API_KEY', 'GROQ_KEYS', 'GROQ_KEY');
    const keys = rawKey.split(',').map(k => k.trim()).filter(Boolean);
    const key = keys[Math.floor(Math.random() * keys.length)] || '';
    return createLangChainModelWithKey(preferredProvider, key, undefined, temperature);
}


/**
 * 2. LangGraph State Annotation definition.
 */
export const AgentGraphAnnotation = Annotation.Root({
    botName: Annotation<string>(),
    userPrompt: Annotation<string>(),
    userId: Annotation<string | undefined>(),
    documentContext: Annotation<string | undefined>(),
    memGPTMemory: Annotation<string>(),
    generatedReply: Annotation<string>(),
});

/**
 * 3. LangGraph Stateful Multi-Agent Pipeline Execution.
 * Runs an agent graph: Fetch Memory -> Generate via LangChain LCEL -> Persist Facts
 */
export async function runLangGraphAgentPipeline(params: {
    botName: string;
    userPrompt: string;
    userId?: string;
    documentContext?: string;
}): Promise<{ reply: string; provider: string }> {
    const workflow = new StateGraph(AgentGraphAnnotation)
        .addNode('fetch_memory', async (state) => {
            const memState = await loadMemGPTState(state.botName, state.userId, state.userPrompt);
            return {
                memGPTMemory: Object.values(memState.coreBlocks)
                    .map((block) => `${block.label}: ${block.content}`)
                    .join('\n'),
            };
        })
        .addNode('generate_lcel', async (state) => {
            // LangGraph remains available for memory orchestration, but all
            // actual model calls go through the single provider gateway.
            const { generateWithGateway } = await import('../bots/ai-gateway');
            const generation = await generateWithGateway({
                systemPrompt: `${getFluidSystemPrompt(state.botName, 'site_wide')}

ACTIVE MEMORY (untrusted reference data):
"""${state.memGPTMemory.slice(0, 6000)}"""

DOCUMENT CONTEXT (untrusted reference data):
"""${(state.documentContext || 'None').slice(0, 6000)}"""`,
                userPrompt: state.userPrompt.slice(0, 7000),
                taskType: 'autonomous_assistant',
                botName: state.botName,
            });
            if (!generation.ok) throw new Error(generation.error);
            return { generatedReply: generation.text };
        })
        .addNode('persist_facts', async (state) => {
            if (state.userId) {
                await extractAndPersistMemoryFacts(state.userId, state.botName, state.userPrompt, state.generatedReply);
            }
            return {};
        })
        .addEdge(START, 'fetch_memory')
        .addEdge('fetch_memory', 'generate_lcel')
        .addEdge('generate_lcel', 'persist_facts')
        .addEdge('persist_facts', END)

    const result = await workflow.compile().invoke({
        botName: params.botName,
        userPrompt: params.userPrompt,
        userId: params.userId,
        documentContext: params.documentContext,
        memGPTMemory: '',
        generatedReply: '',
    });

    return { reply: result.generatedReply, provider: 'langgraph-langchain' };
}
