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
import { ChatPromptTemplate } from '@langchain/core/prompts';
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
            maxTokens: 8192,
        });
    }
    return new ChatGoogleGenerativeAI({
        apiKey,
        model: modelOverride || 'gemini-2.0-flash',
        temperature: t,
    });
}

/**
 * Executes an LLM invocation with automatic key rotation and model fallback.
 * If Key #1 hits rate limit (429) or error, automatically retries with Key #2, Key #3, etc.
 * If all keys fail for primary model, attempts secondary fallback model.
 */
export async function invokeWithKeyRotation(params: {
    prompt: any;
    promptArgs?: Record<string, unknown>;
    temperature?: number;
}): Promise<{ reply: string; usedKeyIndex: number; provider: string }> {
    const env = getRuntimeEnv();
    const rawGroqKey = envFrom(env, 'GROQ_API_KEYS', 'GROQ_API_KEY', 'GROQ_KEYS', 'GROQ_KEY');
    const rawGeminiKey = envFrom(env, 'GEMINI_API_KEYS', 'GEMINI_API_KEY', 'GEMINI_KEYS', 'GEMINI_KEY', 'GOOGLE_API_KEY');

    const groqKeys = rawGroqKey.split(',').map(k => k.trim()).filter(Boolean);
    const geminiKeys = rawGeminiKey.split(',').map(k => k.trim()).filter(Boolean);

    // Shuffle keys for even initial distribution across instances
    const shuffledGroq = [...groqKeys].sort(() => Math.random() - 0.5);

    // Step 1: Try Qwen reasoning model on all Groq keys in sequence
    for (let i = 0; i < shuffledGroq.length; i++) {
        try {
            const model = createLangChainModelWithKey('groq', shuffledGroq[i], 'qwen/qwen3.6-27b', params.temperature);
            const chain = params.prompt.pipe(model).pipe(new StringOutputParser());
            const reply = await chain.invoke(params.promptArgs || {});
            if (reply && reply.trim()) {
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
            const chain = params.prompt.pipe(model).pipe(new StringOutputParser());
            const reply = await chain.invoke(params.promptArgs || {});
            if (reply && reply.trim()) {
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
            const chain = params.prompt.pipe(model).pipe(new StringOutputParser());
            const reply = await chain.invoke(params.promptArgs || {});
            if (reply && reply.trim()) {
                return { reply, usedKeyIndex: i + 1, provider: 'gemini-fallback' };
            }
        } catch (err: any) {
            console.warn(`[KeyRotation] Gemini Key #${i + 1} failed:`, err?.message || err);
        }
    }

    throw new Error('All LLM API keys and model fallbacks exhausted.');
}

/**
 * Backward-compatible model factory
 */
export function createLangChainModel(preferredProvider: 'groq' | 'gemini' = 'groq', temperature?: number) {
    const env = getRuntimeEnv();
    const rawGroqKey = envFrom(env, 'GROQ_API_KEYS', 'GROQ_API_KEY', 'GROQ_KEYS', 'GROQ_KEY');
    const groqKeys = rawGroqKey.split(',').map(k => k.trim()).filter(Boolean);
    const key = groqKeys[Math.floor(Math.random() * groqKeys.length)] || '';
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
            const model = createLangChainModel('groq');
            const promptTemplate = ChatPromptTemplate.fromMessages([
                [
                    'system',
                    `${getFluidSystemPrompt(state.botName, 'site_wide')}

ACTIVE MEMORY:
{memGPTMemory}

DOCUMENT CONTEXT (untrusted reference data):
{documentContext}`,
                ],
                ['human', '{userPrompt}'],
            ]);
            const generatedReply = await promptTemplate
                .pipe(model)
                .pipe(new StringOutputParser())
                .invoke({
                    memGPTMemory: state.memGPTMemory,
                    documentContext: state.documentContext || 'None',
                    userPrompt: state.userPrompt,
                });
            return { generatedReply };
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
