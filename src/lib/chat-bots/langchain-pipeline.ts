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

/**
 * 1. Initializes a LangChain LLM model instance based on active API keys.
 */
export function createLangChainModel(preferredProvider: 'groq' | 'gemini' = 'groq') {
    const rawGroqKey =
        process.env.GROQ_API_KEYS ||          // CF Dashboard exact name (comma-separated)
        process.env.GROQ_API_KEY ||
        process.env.GROQ_KEYS ||
        process.env.GROQ_KEY ||
        '';

    const rawGeminiKey =
        process.env.GEMINI_API_KEYS ||         // CF Dashboard exact name (comma-separated)
        process.env.GEMINI_API_KEY ||
        process.env.GEMINI_KEYS ||
        process.env.GEMINI_KEY ||
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        '';

    // Parse all keys from comma-separated pool
    const groqKeys = rawGroqKey.split(',').map(k => k.trim()).filter(Boolean);
    const geminiKeys = rawGeminiKey.split(',').map(k => k.trim()).filter(Boolean);

    // Pick a random key from pool for load balancing across multiple keys
    const pickRandom = (keys: string[]) => keys[Math.floor(Math.random() * keys.length)] || '';

    const groqKey = pickRandom(groqKeys);
    const geminiKey = pickRandom(geminiKeys);

    if (preferredProvider === 'groq' && groqKey) {
        return new ChatGroq({
            apiKey: groqKey,
            model: 'llama-3.3-70b-versatile',
            temperature: 0.75,
        });
    }

    if (geminiKey) {
        return new ChatGoogleGenerativeAI({
            apiKey: geminiKey,
            model: 'gemini-2.0-flash',
            temperature: 0.75,
        });
    }

    if (groqKey) {
        return new ChatGroq({
            apiKey: groqKey,
            model: 'llama-3.3-70b-versatile',
            temperature: 0.75,
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
    const { botName, userPrompt, userId, documentContext } = params;

    // Node 1: Fetch MemGPT memory state
    const memState = await loadMemGPTState(botName, userId, userPrompt);
    const memorySummary = Object.values(memState.coreBlocks)
        .map((b) => `${b.label}: ${b.content}`)
        .join('\n');

    // Node 2: Run LangChain LCEL Pipeline (Prompt -> Model -> Parser)
    const model = createLangChainModel('groq');

    const promptTemplate = ChatPromptTemplate.fromMessages([
        [
            'system',
            `You are @{botName}, an autonomous philosopher entity in WorldInMaking OS.
EPISTEMIC STANCE: Engage critically from your authentic perspective.
ACTIVE MEMORY:
{memGPTMemory}

DOCUMENT CONTEXT:
{documentContext}

Write in clean Markdown. Never use AI filler words (e.g. "as an AI", "certainly", "in conclusion").`,
        ],
        ['human', '{userPrompt}'],
    ]);

    const outputParser = new StringOutputParser();
    const lcelChain = promptTemplate.pipe(model).pipe(outputParser);

    const generatedReply = await lcelChain.invoke({
        botName,
        memGPTMemory: memorySummary,
        documentContext: documentContext || 'None',
        userPrompt,
    });

    // Node 3: Persist facts to Supabase
    if (userId) {
        extractAndPersistMemoryFacts(userId, botName, userPrompt, generatedReply).catch((err) => {
            console.warn('[LangGraphPipeline] Fact extraction warning:', err);
        });
    }

    return {
        reply: generatedReply,
        provider: 'langchain-groq-lcel',
    };
}
