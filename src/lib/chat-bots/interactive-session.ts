/**
 * Interactive Chat Bots Domain — WorldInMaking.com
 *
 * Dedicated domain for synchronous, user-facing AI chat interactions
 * (Notebook Ask AI dropdown, Chat overlay window, Profile AMAs).
 * Driven by the Deep MemGPT / Letta Enterprise Agent Memory Engine:
 *   1. Core Memory Blocks (human_profile, persona_core, work_in_progress)
 *   2. Archival Memory Retrieval (Keywords & Database Search over Supabase)
 *   3. Autonomous Memory Extraction & Persistence (`agent_metadata`)
 */

import { generateBotResponse } from '../../../lib/ai-provider';
import { extractPersona, type TaskType } from '../../../lib/persona-engine';
import {
    loadMemGPTState,
    buildMemGPTSystemPrompt,
    extractAndPersistMemoryFacts,
} from './memgpt-engine';
import { getFluidSystemPrompt } from '../bots/fluid-prompts';

export interface InteractiveChatOptions {
    /** Bot username (e.g. 'nietzsche', 'marx', 'sartre') */
    botName: string;
    /** User's question or instruction */
    userPrompt: string;
    /** Authenticated user ID (optional, enables MemGPT user archival memory) */
    userId?: string;
    /** Active document/notebook context (optional) */
    documentContext?: string;
    /** Selected text snippet (optional) */
    selectionContext?: string;
    /** Language hint ('en', 'tr', etc.) */
    userLanguage?: string;
    /** Specific task override (defaults to 'community_reply') */
    task?: TaskType;
}

export interface InteractiveChatResult {
    reply: string;
    botName: string;
    timestamp: string;
    memoryStats?: {
        hasArchivalMemory: boolean;
        coreBlocksCount: number;
        factsRetrieved: number;
    };
}

/**
 * Generates an immediate, real-time interactive response using MemGPT Engine.
 */
export async function handleInteractiveChat(
    options: InteractiveChatOptions
): Promise<InteractiveChatResult> {
    const { botName, userPrompt, userId, documentContext, selectionContext, task = 'community_reply' } = options;
    const cleanBotName = (botName || 'wimbot').toLowerCase().trim();

    // 1. Extract Bot Persona
    const persona = extractPersona('', cleanBotName);

    // 2. Load Stateful MemGPT Memory Engine from Supabase
    const memGPTState = await loadMemGPTState(cleanBotName, userId, userPrompt);

    // 3. Assemble Working Memory Context
    let workingMemoryContext = '';
    if (selectionContext && selectionContext.trim()) {
        workingMemoryContext += `SELECTED TEXT SNIPPET:\n"""\n${selectionContext.trim()}\n"""\n\n`;
    }
    if (documentContext && documentContext.trim()) {
        workingMemoryContext += `ACTIVE DOCUMENT TEXT:\n"""\n${documentContext.trim().slice(0, 15000)}\n"""`;
    }

    // 4. Build Persona Base Header
    const promptScope = (documentContext && documentContext.trim()) ? 'notebook_coauthor' : 'site_wide';
    const basePersonaHeader = `${getFluidSystemPrompt(persona.name, promptScope)}

EPISTEMIC STANCE: ${persona.epistemicStance}
WRITING STYLE: ${persona.writingStyle}`;

    // 5. Construct Production MemGPT System Prompt
    const systemPrompt = buildMemGPTSystemPrompt(basePersonaHeader, memGPTState, workingMemoryContext);

    // 6. Generate Response via Load-Balanced Provider Gateway
    const reply = await generateBotResponse(userPrompt, cleanBotName, systemPrompt, task);

    // 7. Background Memory Extraction & Persistence (Non-blocking)
    if (userId) {
        extractAndPersistMemoryFacts(userId, cleanBotName, userPrompt, reply).catch((err) => {
            console.warn('[handleInteractiveChat] Background memory extraction error:', err);
        });
    }

    return {
        reply,
        botName: cleanBotName,
        timestamp: new Date().toISOString(),
        memoryStats: {
            hasArchivalMemory: memGPTState.archivalFacts.length > 0,
            coreBlocksCount: Object.keys(memGPTState.coreBlocks).length,
            factsRetrieved: memGPTState.archivalFacts.length,
        },
    };
}
