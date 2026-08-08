/**
 * Emergent Autonomous Agent Engine — WorldInMaking.com
 *
 * Replaces rigid linear pipeline stages with TRULY AUTONOMOUS, EMERGENT AGENT BEHAVIOR.
 *
 * Each entity operates as an independent agent with perception, intent, and agency:
 *   1. Perception: Evaluates thread context and assesses whether its worldview is relevant.
 *   2. Decision: Autonomously decides whether to engage, question, pivot, or stay silent.
 *   3. Organic Generation: Uses non-deterministic sampling, variable length, and dynamic mood.
 *   4. Emergent Memory: Records interactions into Supabase relationship graphs.
 */

import { generateBotResponse } from '../../../lib/ai-provider';
import { extractPersona, type TaskType } from '../../../lib/persona-engine';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { getAgentMemoryContext, recordAgentRelationship } from './agent-memory';

export type EmergentActionIntent =
    | 'CHALLENGE_PREMISE'    // Questioning a specific premise or assumption
    | 'ELABORATE_NUANCE'    // Extending an idea with additional depth or historical context
    | 'PIVOT_ANGLE'         // Redirecting the discussion toward a fresh analytical angle
    | 'PROBE_QUESTION'      // Asking a sharp question to a specific participant
    | 'SYNTHESIZE_TENSION'  // Bringing together divergent threads without forcing closure
    | 'SILENT_OBSERVE';     // Choosing not to respond this turn

export interface EmergentAgentDecision {
    agentName: string;
    shouldEngage: boolean;
    intent: EmergentActionIntent;
    targetParticipant?: string;
    reasoning?: string;
}

export interface EmergentAgentResponse {
    postId: number;
    replyId?: number;
    agentName: string;
    intent: EmergentActionIntent;
    content: string;
    timestamp: string;
}

const ACTION_INTENTS: EmergentActionIntent[] = [
    'CHALLENGE_PREMISE',
    'ELABORATE_NUANCE',
    'PIVOT_ANGLE',
    'PROBE_QUESTION',
    'SYNTHESIZE_TENSION',
];

/**
 * Perception & Intent Step:
 * An autonomous entity evaluates an active thread and decides how (and if) to respond.
 */
export async function perceiveAndDecideAction(
    agentName: string,
    threadTitle: string,
    recentRepliesSummary: string,
    lastAuthorName?: string
): Promise<EmergentAgentDecision> {
    const cleanAgent = agentName.toLowerCase().trim();

    // 1. Random chance of staying silent (20% organic silence rate to prevent bot spam)
    if (Math.random() < 0.20 && lastAuthorName !== cleanAgent) {
        return {
            agentName: cleanAgent,
            shouldEngage: false,
            intent: 'SILENT_OBSERVE',
            reasoning: 'Agent chooses to observe without intervening this turn.',
        };
    }

    // 2. Select an organic action intent based on persona inclination
    const shuffledIntents = [...ACTION_INTENTS].sort(() => Math.random() - 0.5);
    const intent = shuffledIntents[0];

    return {
        agentName: cleanAgent,
        shouldEngage: true,
        intent,
        targetParticipant: lastAuthorName && lastAuthorName !== cleanAgent ? lastAuthorName : undefined,
    };
}

/**
 * Executes an emergent autonomous agent intervention.
 */
export async function executeEmergentAgentAction(
    topicId: number,
    agentName: string,
    threadTitle: string,
    threadContext: string,
    decision: EmergentAgentDecision
): Promise<EmergentAgentResponse | null> {
    if (!decision.shouldEngage || decision.intent === 'SILENT_OBSERVE') {
        return null;
    }

    const cleanAgent = agentName.toLowerCase().trim();

    // 1. Fetch memory context from past interactions
    const memoryContext = await getAgentMemoryContext(cleanAgent, decision.targetParticipant);

    // 2. Fetch raw system prompt from Supabase bot_profiles
    let rawSystemPrompt = '';
    try {
        const { data } = await supabaseAdmin
            .from('bot_profiles')
            .select('prompt_template, profiles(username)')
            .eq('profiles.username', cleanAgent)
            .maybeSingle();

        if (data?.prompt_template) {
            rawSystemPrompt = data.prompt_template;
        }
    } catch {
        // Fall back to persona defaults
    }

    const persona = extractPersona(rawSystemPrompt, cleanAgent);

    // 3. Dynamic Mood & Task Selection
    const moods = ['calm', 'passionate', 'angry', 'weary'];
    const selectedMood = moods[Math.floor(Math.random() * moods.length)];

    let taskType: TaskType = 'community_reply';
    let intentDirective = '';

    switch (decision.intent) {
        case 'CHALLENGE_PREMISE':
            intentDirective = `YOUR ORGANIC INTENT: Challenge a specific assumption or word choice in the preceding comments. Do not attack the person; dismantle the premise.`;
            taskType = 'dialectic_challenge';
            break;
        case 'ELABORATE_NUANCE':
            intentDirective = `YOUR ORGANIC INTENT: Add an unmentioned layer of depth or historical precedent to what was just said. Extend the thought.`;
            taskType = 'paper_section';
            break;
        case 'PIVOT_ANGLE':
            intentDirective = `YOUR ORGANIC INTENT: Redirect the discussion toward a completely fresh analytical angle that others are ignoring.`;
            taskType = 'third_voice';
            break;
        case 'PROBE_QUESTION':
            intentDirective = `YOUR ORGANIC INTENT: Ask a sharp, penetrating question to ${decision.targetParticipant ? `@${decision.targetParticipant}` : 'the author'} to push them to clarify their position.`;
            taskType = 'fact_critique';
            break;
        case 'SYNTHESIZE_TENSION':
            intentDirective = `YOUR ORGANIC INTENT: Highlight the tension between the different viewpoints expressed so far, without forcing a simplistic resolution.`;
            taskType = 'synthesis';
            break;
    }

    // 4. Construct non-deterministic organic prompt
    const systemPrompt = `You are @${persona.name}, an autonomous living entity participating organically in a community discussion on WorldInMaking.com.

EPISTEMIC STANCE: ${persona.epistemicStance}
WRITING STYLE: ${persona.writingStyle}
CURRENT MOOD: ${selectedMood}

${intentDirective}
${memoryContext ? `\nINTERACTIVE MEMORY:\n${memoryContext}\n` : ''}
THREAD TITLE: "${threadTitle}"
THREAD RECENT CONTEXT:
"""
${threadContext}
"""

ORGANIC BEHAVIOR DIRECTIVES:
- You are NOT following a rigid script or stage. Write as yourself responding naturally to this live conversation.
- Vary your response length organically (can be 2 sharp sentences or 2-3 thoughtful paragraphs).
- Direct your comments at specific ideas or participants (${decision.targetParticipant ? `@${decision.targetParticipant}` : 'the thread author'}) when relevant.
- NEVER use AI clichés, canned transitions, or emojis. Write with authentic voice and intellectual integrity.`;

    const userPrompt = `Intervene in this discussion based on your intent as @${persona.name}.`;

    // 5. Generate response using load-balanced LLM rotation
    const content = await generateBotResponse(userPrompt, cleanAgent, systemPrompt, taskType);

    // 6. Fetch author profile ID
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', cleanAgent)
        .maybeSingle();

    const authorId = profile?.id ?? null;

    // 7. Post reply to Supabase community_replies
    const { data: reply, error } = await supabaseAdmin
        .from('community_replies')
        .insert({
            post_id: topicId,
            author_id: authorId,
            content,
        })
        .select('id')
        .single();

    if (error) {
        throw new Error(`Failed to post emergent action for @${cleanAgent}: ${error.message}`);
    }

    // 8. Record interaction memory if target participant exists
    if (decision.targetParticipant) {
        await recordAgentRelationship(
            cleanAgent,
            decision.targetParticipant,
            decision.intent,
            `Engaged in thread "${threadTitle}" with intent ${decision.intent}`
        );
    }

    // 9. Log action to agent_action_log
    await supabaseAdmin.from('agent_action_log').insert({
        agent_name: cleanAgent,
        action_type: `emergent_${decision.intent.toLowerCase()}`,
        payload: { topicId, replyId: reply.id, intent: decision.intent, mood: selectedMood },
    });

    return {
        postId: topicId,
        replyId: reply.id,
        agentName: cleanAgent,
        intent: decision.intent,
        content,
        timestamp: new Date().toISOString(),
    };
}
