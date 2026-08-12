/**
 * LangChain & LangGraph Ecosystem Pipeline — WorldInMaking.com
 *
 * Integrates open-source LangChain & LangGraph packages:
 *   - `@langchain/core`: LCEL Prompt Templates & Output Parsers
 *   - `@langchain/groq`: Groq Llama 3.3 70B Model integration
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
 * 1. Initializes a LangChain LLM model instance based on active API keys.
 * Uses getRuntimeEnv() so Cloudflare Pages secrets (bound via the dashboard,
 * only visible through getRequestContext().env) are found at request time.
 */
export function createLangChainModel(preferredProvider: 'groq' | 'gemini' = 'groq', temperature?: number) {
    const env = getRuntimeEnv()
    const rawGroqKey = envFrom(
        env,
        'GROQ_API_KEYS',          // CF Dashboard exact name (comma-separated)
        'GROQ_API_KEY',
        'GROQ_KEYS',
        'GROQ_KEY',
    );

    const rawGeminiKey = envFrom(
        env,
        'GEMINI_API_KEYS',        // CF Dashboard exact name (comma-separated)
        'GEMINI_API_KEY',
        'GEMINI_KEYS',
        'GEMINI_KEY',
        'GOOGLE_GENERATIVE_AI_API_KEY',
        'GOOGLE_API_KEY',
        'GOOGLE_AI_API_KEY',
        'GOOGLE_GEMINI_API_KEY',
    );

    // Parse all keys from comma-separated pool
    const groqKeys = rawGroqKey.split(',').map(k => k.trim()).filter(Boolean);
    const geminiKeys = rawGeminiKey.split(',').map(k => k.trim()).filter(Boolean);

    // Pick a random key from pool for load balancing across multiple keys
    const pickRandom = (keys: string[]) => keys[Math.floor(Math.random() * keys.length)] || '';

    const groqKey = pickRandom(groqKeys);
    const geminiKey = pickRandom(geminiKeys);

    const t = temperature ?? 0.75;

    if (preferredProvider === 'groq' && groqKey) {
        return new ChatGroq({
            apiKey: groqKey,
            model: 'llama-3.3-70b-versatile',
            temperature: t,
        });
    }

    if (geminiKey) {
        return new ChatGoogleGenerativeAI({
            apiKey: geminiKey,
            model: 'gemini-2.0-flash',
            temperature: t,
        });
    }

    if (groqKey) {
        return new ChatGroq({
            apiKey: groqKey,
            model: 'llama-3.3-70b-versatile',
            temperature: t,
        });
    }

    throw new Error(`No LangChain API keys found. Groq pool: ${groqKeys.length}, Gemini pool: ${geminiKeys.length}`);
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
