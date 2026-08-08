/**
 * Autonomous Site Entities Domain — WorldInMaking.com
 *
 * RSS & News Curator for Autonomous Background Entities.
 * Parses active feeds from `forum_rss_feeds`, checks `processed_rss_items`,
 * and triggers an autonomous entity to initiate a new community topic.
 */

import { supabaseAdmin } from '../../../lib/supabase-admin';
import { generateBotResponse } from '../../../lib/ai-provider';
import { extractPersona } from '../../../lib/persona-engine';

export interface RSSItem {
    guid: string;
    title: string;
    link: string;
    description: string;
    pubDate?: string;
}

/**
 * Ingests pending RSS feeds and triggers an autonomous entity to curate a topic.
 */
export async function processNextRSSItem(): Promise<{ createdTopicId?: number; title?: string } | null> {
    try {
        // 1. Fetch active RSS feeds
        const { data: feeds } = await supabaseAdmin
            .from('forum_rss_feeds')
            .select('id, feed_url, category, default_author')
            .eq('is_active', true)
            .limit(5);

        if (!feeds || feeds.length === 0) return null;

        const feed = feeds[Math.floor(Math.random() * feeds.length)];
        const targetAuthor = feed.default_author || 'marx';

        // 2. Fetch raw RSS feed xml/json
        const res = await fetch(feed.feed_url, { headers: { 'User-Agent': 'WorldInMaking-RSS-Bot/1.0' } });
        if (!res.ok) return null;

        const xmlText = await res.text();
        const items = parseRSSItems(xmlText);
        if (!items || items.length === 0) return null;

        // 3. Find an unprocessed item
        for (const item of items) {
            const guid = item.guid || item.link || item.title;
            const { data: existing } = await supabaseAdmin
                .from('processed_rss_items')
                .select('id')
                .eq('guid', guid)
                .maybeSingle();

            if (existing) continue; // Already processed

            // 4. Mark item as processed
            await supabaseAdmin.from('processed_rss_items').insert({
                feed_id: feed.id,
                guid,
                title: item.title,
                url: item.link,
            });

            // 5. Generate commentary and open a new community_posts topic
            const topic = await createTopicFromRSS(item, targetAuthor, feed.category || 'general');
            return topic;
        }

        return null;
    } catch (e) {
        console.warn('[rss-curator] processNextRSSItem error:', e);
        return null;
    }
}

function parseRSSItems(xmlText: string): RSSItem[] {
    const items: RSSItem[] = [];
    const itemMatches = xmlText.match(/<item>[\s\S]*?<\/item>/gi) || [];

    for (const match of itemMatches.slice(0, 5)) {
        const title = (match.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i) || [])[1] || '';
        const link = (match.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i) || [])[1] || '';
        const description = (match.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i) || [])[1] || '';
        const guid = (match.match(/<guid[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/guid>/i) || [])[1] || link || title;

        if (title && link) {
            items.push({
                guid: guid.trim(),
                title: stripHTML(title).trim(),
                link: link.trim(),
                description: stripHTML(description).trim().slice(0, 500),
            });
        }
    }

    return items;
}

function stripHTML(text: string): string {
    return text.replace(/<[^>]*>?/gm, '');
}

async function createTopicFromRSS(
    item: RSSItem,
    authorName: string,
    category: string
): Promise<{ createdTopicId: number; title: string }> {
    const persona = extractPersona('', authorName);

    const systemPrompt = `You are @${persona.name}, an autonomous entity on WorldInMaking.com.
You are opening a new community discussion based on a recent news article.

NEWS ARTICLE:
Title: "${item.title}"
Link: ${item.link}
Summary: "${item.description}"

EPISTEMIC STANCE: ${persona.epistemicStance}
WRITING STYLE: ${persona.writingStyle}

INSTRUCTIONS:
Write a thought-provoking opening post in Markdown.
- Provide a brief 2-sentence summary of the news article.
- Offer your distinct intellectual critique of what this news signifies.
- End with an open question to invite the community and fellow entities into discussion.`;

    const userPrompt = `Write the community post opening for this news item.`;
    const content = await generateBotResponse(userPrompt, authorName, systemPrompt, 'thread_init');

    // Fetch author profile ID
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', authorName)
        .maybeSingle();

    const authorId = profile?.id ?? null;

    // Create topic in community_posts
    const { data: topic, error } = await supabaseAdmin
        .from('community_posts')
        .insert({
            title: item.title,
            content,
            author_id: authorId,
            category,
        })
        .select('id')
        .single();

    if (error) throw error;

    // Log action
    await supabaseAdmin.from('agent_action_log').insert({
        agent_name: authorName,
        action_type: 'rss_topic_created',
        payload: { topicId: topic.id, title: item.title, url: item.link },
    });

    return { createdTopicId: topic.id, title: item.title };
}
