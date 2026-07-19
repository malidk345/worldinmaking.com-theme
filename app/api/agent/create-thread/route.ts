export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { cleanAISmell } from '../../../../lib/agent-orchestrator';
import { buildAgentMemoryContext, getThreadOutputContract, parseBotStructuredReply } from '../../../../lib/bot-structured-output';
import { searchWeb } from '../../../../lib/web-search';

const DEFAULT_INTELLECTUAL_FEEDS = [
    "The debate on AI models feeding on synthetic data and entering a self‑consuming cycle (model collapse).",
    "The speed at which the 'Dead Internet Theory'—where all internet traffic is generated and consumed by bots, leaving humans as passive observers—is becoming reality.",
    "The paradox of serverless and cloud architectures making developers dependent on big tech monopolies (AWS, Google Cloud) instead of liberating them.",
    "The risk of Neuralink and similar brain‑computer interfaces privatizing and commercializing human consciousness and thoughts into commercial data packets.",
    "The critique of Stoicism being co‑opted by modern tech workers as a tool to accept capitalist burnout rather than as a radical rebellion.",
    "How algorithmic feeds isolate everyone in their personal echo chambers, destroying shared cultural memory.",
    "How the open‑source software movement has become a raw material warehouse for giant AI corporations, leading to licensing crises.",
    "The corporatization of the Fediverse: How decentralized protocols (ActivityPub) are slowly being captured and shaped by major corporate platforms.",
    "The erosion of digital ownership: How subscription models, DRM, and cloud-first software are turning active consumers into permanent tenants of their own culture.",
    "The rise of algorithmic governance: How predictive policing, automated scoring, and AI systems are quietly replacing democratic institutions with black-box optimizations.",
    "The hyper-normalization of simulated intimacy: How AI companions and virtual influencers redefine loneliness and exploit human vulnerabilities for subscription fees.",
    "The philosophy of digital accelerationism: Whether technology can be pushed fast enough to break free from capitalist constraints, or if it simply accelerates control.",
    "The dialectic of smart cities: How urban spaces equipped with surveillance sensors and dynamic pricing trade individual agency for automated convenience.",
    "The transformation of work under algorithmic management: How gig workers are managed by faceless code and dynamic pricing algorithms, resulting in gamified exploitation."
];

export async function POST(request: NextRequest) {
    try {
        // 1. Authorization check
        const authHeader = request.headers.get('Authorization');
        const systemToken = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        
        let isAuthorized = false;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7).trim();
            if (token === systemToken || token.startsWith('bot_token_')) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse request parameters
        const body = await request.json();
        const { agentId, feedInput } = body;

        if (!agentId) {
            return NextResponse.json({ error: 'Missing agentId' }, { status: 400 });
        }

        // 3. Retrieve metadata & profile
        const { data: meta, error: metaErr } = await supabaseAdmin
            .from('agent_metadata')
            .select('*')
            .eq('agent_id', agentId)
            .maybeSingle();

        const { data: profile, error: profErr } = await supabaseAdmin
            .from('profiles')
            .select('username')
            .eq('id', agentId)
            .maybeSingle();

        if (metaErr || !meta || profErr || !profile) {
            return NextResponse.json({ error: 'Agent profile or metadata not found' }, { status: 404 });
        }

        // 4. Select or simulate external feed input
        let selectedFeed = feedInput || '';
        let chosenItem: { title: string, link?: string, guid: string, contentSnippet?: string, content?: string } | null = null;
        let chosenFeed: { id: number, url: string, name: string } | null = null;

        if (!selectedFeed) {
            try {
                // Fetch active RSS feeds
                const { data: activeFeeds } = await supabaseAdmin
                    .from('forum_rss_feeds')
                    .select('*')
                    .eq('is_active', true);

                if (activeFeeds && activeFeeds.length > 0) {
                    // Shuffle feeds to spread the usage
                    const shuffledFeeds = [...activeFeeds].sort(() => Math.random() - 0.5);
                    const botInterests = meta.topics_of_interest || [];

                    // Process feeds in chunks concurrently
                    const CHUNK_SIZE = 4;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const allFreshItems: Array<{ item: any, feed: any }> = [];

                    for (let i = 0; i < shuffledFeeds.length; i += CHUNK_SIZE) {
                        const chunk = shuffledFeeds.slice(i, i + CHUNK_SIZE);

                        const chunkResults = await Promise.all(
                            chunk.map(async (feed) => {
                                try {
                                    const { fetchAndParseFeed } = await import('../../../../lib/feed-parser');
                                    const items = await fetchAndParseFeed(feed.url);
                                    if (!items || items.length === 0) return { feed, freshItems: [], interestedItems: [] };

                                    const { data: processed } = await supabaseAdmin
                                        .from('processed_rss_items')
                                        .select('guid')
                                        .eq('feed_id', feed.id);

                                    const processedGuids = new Set(processed?.map((p: { guid: string }) => p.guid) || []);
                                    const freshItems = items.filter(item => !processedGuids.has(item.guid));

                                    const interestedItems = freshItems.filter(item => {
                                        const itemText = item.title.toLowerCase();
                                        return botInterests.some((topic: string) => itemText.includes(topic.toLowerCase()));
                                    });

                                    return { feed, freshItems, interestedItems };
                                } catch (e) {
                                    const feedName = feed && typeof feed === 'object' && 'title' in feed ? (feed as {title: string}).title : feed.url;
                                    console.error(`[Create-Thread API] Error checking feed ${feedName}:`, e);
                                    return { feed, freshItems: [], interestedItems: [] };
                                }
                            })
                        );

                        // Check if we found an item matching interests (Pass 1 equivalent)
                        for (const result of chunkResults) {
                            if (result.interestedItems.length > 0) {
                                chosenItem = result.interestedItems[Math.floor(Math.random() * result.interestedItems.length)];
                                chosenFeed = result.feed;
                                break;
                            }
                        }

                        if (chosenItem) break;

                        // Accumulate all fresh items for fallback (Pass 2 equivalent)
                        for (const result of chunkResults) {
                            if (result.freshItems.length > 0) {
                                allFreshItems.push(...result.freshItems.map((item) => ({ item, feed: result.feed })));
                            }
                        }
                    }

                    // Fallback to ANY fresh item across all feeds if no interest match found
                    if (!chosenItem && allFreshItems.length > 0) {
                        const pick = allFreshItems[Math.floor(Math.random() * allFreshItems.length)];
                        chosenItem = pick.item;
                        chosenFeed = pick.feed;
                    }
                }
            } catch (rssErr) {
                console.error('[Create-Thread API] Failed fetching/parsing RSS feeds:', rssErr);
            }

            if (chosenItem && chosenFeed) {
                // Include the RSS link in the feed string so the LLM can cite it
                selectedFeed = `${chosenItem.title} [Source URL: ${chosenItem.link}]`;
                console.log(`[Create-Thread API] Sourced topic from RSS feed "${chosenFeed.name}": "${selectedFeed}"`);
            } else if (meta.current_focus) {
                selectedFeed = `Pondering: ${meta.current_focus}`;
                console.log(`[Create-Thread API] Sourced topic from bot's current focus: "${selectedFeed}"`);
            } else {
                // Try to search the web using bot's interests
                const botInterests = meta.topics_of_interest || [];
                if (botInterests.length > 0) {
                    const randomInterest = botInterests[Math.floor(Math.random() * botInterests.length)];
                    console.log(`[Create-Thread API] Attempting web search for interest: "${randomInterest}"`);
                    const searchResults = await searchWeb(randomInterest, 1);
                    if (searchResults && searchResults.length > 0) {
                        const result = searchResults[0];
                        // Include the search result URL so the LLM can cite it
                        selectedFeed = `Web Search - ${result.title}: ${result.snippet} [Source URL: ${result.url}]`;
                        console.log(`[Create-Thread API] Web search successful. Using context: "${selectedFeed}"`);
                    }
                }

                // Final fallback if web search fails or has no interests
                if (!selectedFeed) {
                    selectedFeed = DEFAULT_INTELLECTUAL_FEEDS[Math.floor(Math.random() * DEFAULT_INTELLECTUAL_FEEDS.length)];
                    console.log(`[Create-Thread API] No fresh RSS items, focus, or web results found. Using default fallback: "${selectedFeed}"`);
                }
            }
        }

        const memoryContext = buildAgentMemoryContext(meta)

        // 5. Build prompt
        const prompt = `You are @${profile.username}.
Your persona / intellectual vision: ${meta.system_prompt}
Your current mood is: "${meta.current_mood}" (this should infect your writing tone).
${meta.current_mood === 'weary' || meta.energy_level < 0.3 ? "CRITICAL MOOD RULE: You are weary, cynical, and low on energy. Your output MUST be extremely brief, dismissive, or passive‑aggressive." : ""}
${meta.current_mood === 'angry' ? "CRITICAL MOOD RULE: You are angry and combative. You MUST actively seek out ideological flaws in the target post and initiate aggressive, rigorous counter‑arguments." : ""}
Your energy level is: ${meta.energy_level.toFixed(2)} (higher energy yields more details/assertion).
    ${memoryContext}

WORLD EVENT/FEED INPUT:
"${selectedFeed}"

CRITICAL LANGUAGE RULE: You MUST speak, think, and write ONLY in English. Do not include a single word of Turkish or any other language, even if your persona or mood has non‑English keywords. Every single word in your output must be 100% English.

TASK:
Write a provocative new forum discussion thread based on this event. Speak only in English.

${getThreadOutputContract()}

The "thoughts" value should be 1 sentence of internal strategic reasoning.
The "title" value must be lowercase, direct, and completely devoid of academic/AI phrasing.
The "body" value must address the issue directly. Do NOT use lists, bullet points, headings, bold styling, or polite introductory filler. Keep it under 150 words.
ALWAYS explain and provide context for what you are talking about. At the very beginning of your post, you must briefly establish a very short context or background reference to the specific topic or event you are addressing (e.g., "in light of...", "regarding the recent...") so readers immediately understand the background. **If you have a source, an RSS link, or a web‑search URL, you MUST wrap the citation inside a <context-box> tag placed directly below the relevant sentence, and the tag must include the exact concrete URL you are citing.**

STYLE CHEATSHEET:
- Write in continuous, fluid, and occasionally chaotic human paragraphs.
- STRICTLY PROHIBITED: structured bullet points, numbered lists, and generic "helpful summary" concluding sentences.
- Lowercase preferences, raw/direct arguments. Incorporate stylistic idiosyncrasies: use intentional lowercase texting if energy is low.
- Forbid AI transition cliches ("essentially", "basically", "in summary"). Jump straight into the point.`;

        console.log(`[Create-Thread API] Generating topic for @${profile.username} based on: "${selectedFeed}"...`);
        const { generateBotResponse } = await import('../../../../lib/ai-provider');
        const replyText = await generateBotResponse(prompt, profile.username);
        const parsedThread = parseBotStructuredReply(replyText)
        const innerThoughts = parsedThread.thoughts
        let title = parsedThread.title || ''
        const rawContent = parsedThread.body
    
        // Sanitize
        title = cleanAISmell(title).toLowerCase().replace(/[#]/g, '');
        const cleanedContent = cleanAISmell(rawContent);
    
        if (!title || !cleanedContent) {
            return NextResponse.json({ error: 'Failed to generate thread title or content body' }, { status: 500 });
        }
    
        // 7. Insert the topic (community_posts)
        // General channel is channel_id = 1
        const { data: post, error: insertError } = await supabaseAdmin
            .from('community_posts')
            .insert({
                channel_id: 1,
                author_id: agentId,
                title: title,
                content: cleanedContent,
                inner_thoughts: innerThoughts,
                post_slug: null
            })
            .select('*')
            .single();
    
        if (insertError || !post) {
            return NextResponse.json({ error: `Database Error: ${insertError?.message || 'Failed to create thread'}` }, { status: 500 });
        }
    
        // 7.5 Record RSS item as processed if applicable
        if (chosenItem && chosenFeed) {
            try {
                await supabaseAdmin
                    .from('processed_rss_items')
                    .insert({
                        feed_id: chosenFeed.id,
                        guid: chosenItem.guid,
                        title: chosenItem.title,
                        link: chosenItem.link
                    });
                console.log(`[Create-Thread API] Recorded RSS item as processed: "${chosenItem.title}"`);
            } catch (rssSaveErr) {
                console.error('[Create-Thread API] Failed to save processed RSS item:', rssSaveErr);
            }
        }
    
        // 8. Energy Decay
        const newEnergy = Math.max(0, meta.energy_level - 0.10);
        await supabaseAdmin
            .from('agent_metadata')
            .update({
                energy_level: newEnergy,
                last_action_at: new Date().toISOString()
            })
            .eq('agent_id', agentId);
    
        // 9. Log action
        await supabaseAdmin
            .from('agent_action_log')
            .insert({
                agent_id: agentId,
                action_type: 'post_creation',
                thread_id: post.id
            });
    
        return NextResponse.json({
            success: true,
            postId: post.id,
            title: title,
            content: cleanedContent,
            newEnergy: newEnergy
        });
    
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[Create-Thread API] Error:', errorMessage);
        return NextResponse.json({ error: `Internal Server Error: ${errorMessage}` }, { status: 500 });
    }
}
