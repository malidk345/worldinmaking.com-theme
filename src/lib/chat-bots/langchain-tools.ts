/**
 * LangChain Dynamic Tools & Function Calling — WorldInMaking.com
 *
 * Equips philosopher bots with executable tools:
 *   1. `DatabaseSearchTool`: Queries Supabase community posts and notebooks.
 *   2. `WebSearchTool`: Fetches live web/news content for real-world awareness.
 *   3. `NotebookInspectorTool`: Reads user's active workspace notes.
 */

import { DynamicTool } from '@langchain/core/tools';
import { supabaseAdmin } from '../../../lib/supabase-admin';

/**
 * Creates the Supabase Database Search Tool for LangChain agents.
 */
export function createDatabaseSearchTool() {
    return new DynamicTool({
        name: 'database_search',
        description: 'Searches WorldInMaking community forum posts and philosopher debates for a given keyword.',
        func: async (query: string) => {
            try {
                const cleanQuery = query.trim().replace(/[^a-z0-9\s]/gi, '');
                const { data } = await supabaseAdmin
                    .from('community_posts')
                    .select('title, content, created_at')
                    .ilike('title', `%${cleanQuery}%`)
                    .limit(3);

                if (!data || data.length === 0) {
                    return `No database posts found for query: "${query}"`;
                }

                return data.map((p) => `Title: "${p.title}" | Excerpt: ${p.content.slice(0, 150)}...`).join('\n');
            } catch (e: any) {
                return `Database search error: ${e?.message || 'failed'}`;
            }
        },
    });
}

/**
 * Creates the Web & News Search Tool for LangChain agents.
 */
export function createWebSearchTool() {
    return new DynamicTool({
        name: 'web_search',
        description: 'Fetches recent technology, economic, and philosophical news headlines.',
        func: async (query: string) => {
            try {
                const res = await fetch(`https://aeon.co/feed.rss`, {
                    headers: { 'User-Agent': 'WorldInMaking-LangChain/1.0' },
                });
                if (!res.ok) return `Could not fetch live web feed.`;
                const text = await res.text();
                const matches = text.match(/<title[^>]*>([\s\S]*?)<\/title>/gi) || [];
                const headlines = matches.slice(1, 4).map((t) => t.replace(/<[^>]+>/g, '').trim());
                return `Recent headlines related to "${query}":\n${headlines.join('\n')}`;
            } catch (e: any) {
                return `Web search error: ${e?.message || 'failed'}`;
            }
        },
    });
}

/**
 * Creates the Active Notebook Inspector Tool for LangChain agents.
 */
export function createNotebookInspectorTool(userId?: string) {
    return new DynamicTool({
        name: 'notebook_inspector',
        description: 'Inspects active user notebook titles and recent draft notes in the workspace.',
        func: async (query: string) => {
            if (!userId) return 'User is operating in anonymous session mode.';
            try {
                const { data } = await supabaseAdmin
                    .from('wim_notebooks')
                    .select('title, updated_at')
                    .or(`auth_user_id.eq.${userId},owner_id.eq.${userId}`)
                    .limit(3);

                if (!data || data.length === 0) return 'No user notebooks found.';
                return `Active user notebooks:\n${data.map((n) => `- ${n.title}`).join('\n')}`;
            } catch (e: any) {
                return `Notebook inspection error: ${e?.message || 'failed'}`;
            }
        },
    });
}

/**
 * Returns the full suite of LangChain tools for a philosopher bot session.
 */
export function getPhilosopherTools(userId?: string) {
    return [
        createDatabaseSearchTool(),
        createWebSearchTool(),
        createNotebookInspectorTool(userId),
    ];
}
