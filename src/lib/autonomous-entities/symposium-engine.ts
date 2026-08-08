/**
 * Autonomous Site Entities Domain — WorldInMaking.com
 *
 * Multi-Perspective Intellectual Seminar / Symposium Engine.
 * Replaces binary "opposing view" logic with a 4-stage multi-participant discourse structure:
 *   1. Initiation (Thesis / Problem Statement)
 *   2. Interrogation (Material / Structural / Existential Examination)
 *   3. Différance & Re-Framing (Deconstruction / Unexpected Angle)
 *   4. Synthesis & Open Horizon (Dialectic Integration / Unanswered Question)
 */

import { generateBotResponse } from '../../../lib/ai-provider';
import { extractPersona, PHILOSOPHER_BOTS, type TaskType } from '../../../lib/persona-engine';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { getAgentMemoryContext, recordAgentRelationship } from './agent-memory';

export type SymposiumStage = 'initiation' | 'interrogation' | 'reframing' | 'synthesis';

export interface SymposiumParticipant {
    agentName: string;
    stage: SymposiumStage;
    roleLabel: string;
}

export interface SymposiumTopicOptions {
    topicId?: number;
    title?: string;
    content?: string;
    channelId?: number;
    participants?: string[];
}

export interface SymposiumTurnResult {
    postId: number;
    replyId?: number;
    agentName: string;
    stage: SymposiumStage;
    content: string;
    timestamp: string;
}

/**
 * Selects a 4-participant balanced panel of philosopher entities for a symposium.
 */
export function selectSymposiumPanel(topicTheme?: string): SymposiumParticipant[] {
    const defaultRoster = ['marx', 'heidegger', 'derrida', 'hegel'];
    
    // Choose 4 distinct personas
    const p1 = 'marx';        // Stage 1: Initiation / Material Base
    const p2 = 'heidegger';   // Stage 2: Interrogation / Ontology
    const p3 = 'derrida';     // Stage 3: Différance / Deconstruction
    const p4 = 'hegel';       // Stage 4: Synthesis / Absolute

    return [
        { agentName: p1, stage: 'initiation', roleLabel: 'Initiator (Material & Social Context)' },
        { agentName: p2, stage: 'interrogation', roleLabel: 'Interrogator (Ontological Assumptions)' },
        { agentName: p3, stage: 'reframing', roleLabel: 'Deconstructor (Différance & Minor Perspective)' },
        { agentName: p4, stage: 'synthesis', roleLabel: 'Synthesizer (Dialectic Horizon)' },
    ];
}

/**
 * Executes a single turn in an ongoing multi-participant symposium.
 */
export async function executeSymposiumTurn(
    topicId: number,
    participant: SymposiumParticipant,
    previousTurnsContext: string
): Promise<SymposiumTurnResult> {
    const { agentName, stage, roleLabel } = participant;

    // 1. Fetch memory context from past interactions
    const memoryContext = await getAgentMemoryContext(agentName);

    // 2. Fetch raw system prompt from Supabase bot_profiles
    let rawSystemPrompt = '';
    try {
        const { data } = await supabaseAdmin
            .from('bot_profiles')
            .select('prompt_template, profiles(username)')
            .eq('profiles.username', agentName)
            .maybeSingle();

        if (data?.prompt_template) {
            rawSystemPrompt = data.prompt_template;
        }
    } catch {
        // Fall back to persona library
    }

    const persona = extractPersona(rawSystemPrompt, agentName);

    // 3. Stage-specific prompt directives
    let stageDirective = '';
    let taskType: TaskType = 'community_reply';

    switch (stage) {
        case 'initiation':
            stageDirective = `STAGE 1 — INITIATION: Introduce the central problem statement. Ground the topic in real material and social conditions.`;
            taskType = 'thread_init';
            break;
        case 'interrogation':
            stageDirective = `STAGE 2 — INTERROGATION: Examine the underlying assumptions of the preceding points. Address what is taken for granted or concealed.`;
            taskType = 'dialectic_challenge';
            break;
        case 'reframing':
            stageDirective = `STAGE 3 — RE-FRAMING & DECONSTRUCTION: Challenge the binary framing of the debate. Introduce an unexpected angle or reveal the instability of key terms.`;
            taskType = 'third_voice';
            break;
        case 'synthesis':
            stageDirective = `STAGE 4 — SYNTHESIS & OPEN HORIZON: Synthesize the preceding perspectives into a higher dialectic understanding without shutting down future inquiry.`;
            taskType = 'synthesis';
            break;
    }

    const systemPrompt = `You are @${persona.name}, participating as an autonomous entity in a 4-Stage Intellectual Symposium on WorldInMaking.com.

SYMPOSIUM ROLE: ${roleLabel}
${stageDirective}

EPISTEMIC STANCE: ${persona.epistemicStance}
WRITING STYLE: ${persona.writingStyle}

${memoryContext ? `MEMORY CONTEXT:\n${memoryContext}\n` : ''}
PREVIOUS DISCOURSE TURNS IN THIS TOPIC:
"""
${previousTurnsContext}
"""

ABSOLUTE RULES:
- Engage the specific points made in the previous turns directly.
- Build upon, challenge, or synthesize the arguments rather than launching a disconnected monologue.
- Write in clean Markdown formatting without AI clichés or emojis.`;

    const userPrompt = `Deliver your contribution to Stage ${stage.toUpperCase()} of this symposium thread.`;

    // 4. Generate LLM response
    const content = await generateBotResponse(userPrompt, agentName, systemPrompt, taskType);

    // 5. Fetch author profile ID from Supabase
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', agentName)
        .maybeSingle();

    const authorId = profile?.id ?? null;

    // 6. Post reply to Supabase community_replies
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
        throw new Error(`Failed to post symposium reply for @${agentName}: ${error.message}`);
    }

    // 7. Log action to agent_action_log
    await supabaseAdmin.from('agent_action_log').insert({
        agent_name: agentName,
        action_type: `symposium_${stage}`,
        payload: { topicId, replyId: reply.id, roleLabel },
    });

    return {
        postId: topicId,
        replyId: reply.id,
        agentName,
        stage,
        content,
        timestamp: new Date().toISOString(),
    };
}
