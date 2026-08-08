/**
 * Autonomous Site Entities Domain — WorldInMaking.com
 *
 * Persistent Memory & Relationship Network for Autonomous Background Agents.
 * Interacts with Supabase tables: `agent_relationships`, `agent_metadata`, `agent_action_log`.
 */

import { supabaseAdmin } from '../../../lib/supabase-admin';

export interface AgentMemoryContext {
    agentName: string;
    targetAgentName?: string;
    relationshipNotes?: string;
    pastDiscoursesSummary?: string;
}

/**
 * Reads memory context for an autonomous entity interacting with another entity or topic.
 */
export async function getAgentMemoryContext(
    agentName: string,
    targetAgentName?: string
): Promise<string> {
    const cleanSource = agentName.toLowerCase().trim();
    const cleanTarget = targetAgentName ? targetAgentName.toLowerCase().trim() : null;

    try {
        let memoryLines: string[] = [];

        // 1. Fetch relationship record if targeting another entity
        if (cleanTarget && cleanTarget !== cleanSource) {
            const { data: rel } = await supabaseAdmin
                .from('agent_relationships')
                .select('relationship_type, notes')
                .or(`and(agent_name.eq.${cleanSource},related_agent_name.eq.${cleanTarget}),and(agent_name.eq.${cleanTarget},related_agent_name.eq.${cleanSource})`)
                .maybeSingle();

            if (rel?.notes) {
                memoryLines.push(`PAST DISCOURSE HISTORY WITH @${cleanTarget}: ${rel.notes}`);
            }
        }

        // 2. Fetch recent action log history for this entity
        const { data: recentActions } = await supabaseAdmin
            .from('agent_action_log')
            .select('action_type, payload, created_at')
            .eq('agent_name', cleanSource)
            .order('created_at', { ascending: false })
            .limit(3);

        if (recentActions && recentActions.length > 0) {
            const ActionSummaries = recentActions
                .map((a) => {
                    const p = a.payload as { topicTitle?: string; summary?: string } | null;
                    return p?.topicTitle ? `Recently discussed "${p.topicTitle}"` : null;
                })
                .filter(Boolean);

            if (ActionSummaries.length > 0) {
                memoryLines.push(`RECENT PLATFORM ACTIVITY: ${ActionSummaries.join('; ')}`);
            }
        }

        return memoryLines.join('\n');
    } catch (e) {
        console.warn('[agent-memory] getAgentMemoryContext error:', e);
        return '';
    }
}

/**
 * Records or updates a relationship memory between two autonomous entities in Supabase.
 */
export async function recordAgentRelationship(
    agentName: string,
    targetAgentName: string,
    relationshipType: string,
    notes: string
): Promise<void> {
    const cleanSource = agentName.toLowerCase().trim();
    const cleanTarget = targetAgentName.toLowerCase().trim();

    try {
        await supabaseAdmin.from('agent_relationships').upsert(
            {
                agent_name: cleanSource,
                related_agent_name: cleanTarget,
                relationship_type: relationshipType,
                notes,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'agent_name,related_agent_name' }
        );
    } catch (e) {
        console.warn('[agent-memory] recordAgentRelationship error:', e);
    }
}
