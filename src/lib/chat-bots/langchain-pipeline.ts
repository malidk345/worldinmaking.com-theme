/**
 * LangChain / LangGraph experiment — NOT the live chat path.
 *
 * Live traffic: `/api/chat` → `orchestrate` → `ai-gateway` (plain fetch).
 * Unwired experiment — not imported by product APIs.
 * Do not call it from product APIs; it bypasses gateway failover, SSE, and quotas.
 */

import { ChatGroq } from '@langchain/groq';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { loadMemGPTState, extractAndPersistMemoryFacts } from './memgpt-engine';
import { getFluidSystemPrompt } from '../bots/fluid-prompts';
import { getRuntimeEnv } from '../bots/runtime-env';
import { collectGeminiKeys, collectGroqKeys } from '../bots/ai-gateway';

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
    const groqKeys = collectGroqKeys(env);
    const geminiKeys = collectGeminiKeys(env);

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

    throw new Error('All Groq and Gemini keys failed or rate limited.');
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
    const groqKeys = collectGroqKeys(env);
    const geminiKeys = collectGeminiKeys(env);

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

    throw new Error('All Groq and Gemini keys failed or rate limited');
}

/**
 * Backward-compatible model factory
 */
export function createLangChainModel(preferredProvider: 'groq' | 'gemini' = 'groq', temperature?: number) {
    const env = getRuntimeEnv();
    const keys = preferredProvider === 'gemini' ? collectGeminiKeys(env) : collectGroqKeys(env);
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
