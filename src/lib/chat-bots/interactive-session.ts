/**
 * Interactive Chat Bots Domain — WorldInMaking.com
 *
 * Dedicated domain for synchronous, user-facing AI chat interactions
 * (Notebook Ask AI dropdown, Chat overlay window, Profile AMAs).
 * Completely isolated from autonomous site entity queues.
 */

import { generateBotResponse } from '../../../lib/ai-provider';
import { extractPersona, type TaskType } from '../../../lib/persona-engine';
import { supabase } from '../../lib/supabase';

export interface InteractiveChatOptions {
    /** Bot username (e.g. 'nietzsche', 'marx', 'sartre') */
    botName: string;
    /** User's question or instruction */
    userPrompt: string;
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
}

/**
 * Generates an immediate, real-time interactive response for a user request.
 */
export async function handleInteractiveChat(
    options: InteractiveChatOptions
): Promise<InteractiveChatResult> {
    const { botName, userPrompt, documentContext, selectionContext, task = 'community_reply' } = options;
    const cleanBotName = (botName || 'wimbot').toLowerCase().trim();

    // 1. Fetch raw system prompt from Supabase bot_profiles if available
    let rawSystemPrompt = '';
    try {
        const { data } = await supabase
            .from('bot_profiles')
            .select('prompt_template, profiles(username)')
            .eq('profiles.username', cleanBotName)
            .maybeSingle();

        if (data?.prompt_template) {
            rawSystemPrompt = data.prompt_template;
        }
    } catch {
        // Fall back to persona library defaults
    }

    // 2. Extract structured BotPersona
    const persona = extractPersona(rawSystemPrompt, cleanBotName);

    // 3. Construct user-focused interactive system prompt
    let systemPrompt = `You are @${persona.name}, engaging directly with a user in an interactive workspace session.
    
EPISTEMIC STANCE: ${persona.epistemicStance}
WRITING STYLE: ${persona.writingStyle}

ABSOLUTE RULES:
- Address the user's explicit question directly and helpfully.
- Maintain your authentic intellectual voice without gimmickry.
- Write in clean Markdown formatting (bold, italics, code blocks where helpful).
- Never use AI filler words (e.g. "as an AI", "certainly", "great question").`;

    if (selectionContext && selectionContext.trim()) {
        systemPrompt += `\n\nUSER'S SELECTED TEXT:\n"""\n${selectionContext.trim()}\n"""`;
    }

    if (documentContext && documentContext.trim()) {
        const truncatedDoc = documentContext.trim().slice(0, 15000);
        systemPrompt += `\n\nACTIVE DOCUMENT CONTEXT:\n"""\n${truncatedDoc}\n"""`;
    }

    // 4. Generate response via load-balanced LLM providers
    const reply = await generateBotResponse(userPrompt, cleanBotName, systemPrompt, task);

    return {
        reply,
        botName: cleanBotName,
        timestamp: new Date().toISOString(),
    };
}
