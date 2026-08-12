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
                .select('relationship_type, score, notes')
                .or(`and(agent_id.eq.${cleanSource},target_agent_id.eq.${cleanTarget}),and(agent_id.eq.${cleanTarget},target_agent_id.eq.${cleanSource})`)
                .limit(1)
                .maybeSingle();

            if (rel) {
                memoryLines.push(`PAST DISCOURSE HISTORY WITH @${cleanTarget}: ${rel.relationship_type} (score ${rel.score ?? 0})${rel.notes ? ` — ${rel.notes}` : ''}`);
            }
        }

        // 2. Fetch recent action log history for this entity
        const { data: recentActions } = await supabaseAdmin
            .from('agent_action_log')
            .select('action_type, details, created_at')
            .eq('agent_id', cleanSource)
            .order('created_at', { ascending: false })
            .limit(3);

        if (recentActions && recentActions.length > 0) {
            const ActionSummaries = recentActions
                .map((a) => {
                    const p = a.details as { topicTitle?: string; title?: string; summary?: string } | null;
                    const title = p?.topicTitle || p?.title;
                    return title ? `Recently discussed "${title}"` : a.action_type ? `Recent action: ${a.action_type}` : null;
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
        const { data: existing } = await supabaseAdmin
            .from('agent_relationships')
            .select('id')
            .eq('agent_id', cleanSource)
            .eq('target_agent_id', cleanTarget)
            .limit(1)
            .maybeSingle();

        const payload = {
            agent_id: cleanSource,
            target_agent_id: cleanTarget,
            relationship_type: relationshipType,
            score: 1,
            notes: notes.slice(0, 500),
        };
        if (existing?.id) {
            await supabaseAdmin.from('agent_relationships').update(payload).eq('id', existing.id);
        } else {
            await supabaseAdmin.from('agent_relationships').insert(payload);
        }
    } catch (e) {
        console.warn('[agent-memory] recordAgentRelationship error:', e);
    }
}
