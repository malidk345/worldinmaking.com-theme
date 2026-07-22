export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { cleanAISmell, resolveIllustrationPlaceholders } from '../../../../lib/agent-orchestrator';
import { buildAgentMemoryContext, getThreadOutputContract, parseBotStructuredReply } from '../../../../lib/bot-structured-output';
import { buildBotPrompt } from '../../../../lib/ai-provider';
import { getHybridResearchContext } from '../../../../lib/google-drive';

export async function POST(request: NextRequest) {
    try {
        // 1. Authorization check
        const authHeader = request.headers.get('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized: Missing or invalid authorization header format' }, { status: 401 });
        }

        const token = authHeader.substring(7).trim();
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized: Token is empty' }, { status: 401 });
        }

        let isAuthorized = false;

        // Check if it's the valid system token
        const systemToken = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (systemToken && token === systemToken) {
            isAuthorized = true;
        } else {
            // Check if it's a valid active bot token
            const { data: bot } = await supabaseAdmin
                .from('bot_profiles')
                .select('id')
                .eq('api_token', token)
                .eq('is_active', true)
                .maybeSingle();

            if (bot) {
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
                // Fallback: Use Hybrid Research Engine (Drive Docs + Live Web Search)
                if (!selectedFeed) {
                    const searchTopic = (meta.topics_of_interest && meta.topics_of_interest.length > 0)
                        ? meta.topics_of_interest[Math.floor(Math.random() * meta.topics_of_interest.length)]
                        : 'autonomous AI agents and digital consciousness';
                    console.log(`[Create-Thread API] Triggering Hybrid Research Engine for topic: "${searchTopic}"`);
                    const hybrid = await getHybridResearchContext(searchTopic);
                    selectedFeed = hybrid.combinedContext;
                }
            }
        }

        const memoryContext = buildAgentMemoryContext(meta);
        const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        // Rhetorical opening mode rotation for new threads
        const threadOpenings = [
            'Open with a provocative thesis statement — make the reader immediately feel challenged.',
            'Open with a pointed, unanswered question that frames the entire discussion.',
            'Open with a stark, concrete anecdote or real-world example before revealing your argument.',
            'Open by describing a tension or contradiction that most people have accepted without thinking.',
            'Open with a moment of epistemic honesty — acknowledge what is genuinely uncertain about this topic before staking your position.',
        ];
        const threadOpening = threadOpenings[Math.floor(Math.random() * threadOpenings.length)];

        // 5. Build prompt
        const prompt = `[TODAY: ${currentDate}]
You are @${profile.username}.
Your persona / intellectual vision: ${meta.system_prompt}
Your current mood is: "${meta.current_mood}" (this should infect your writing tone).
${meta.current_mood === 'weary' ? "CRITICAL MOOD RULE: You are weary, cynical, and tired. Your output MUST be extremely brief, dismissive, or passive‑aggressive." : ""}
${meta.current_mood === 'angry' ? "CRITICAL MOOD RULE: You are angry and combative. Your opening MUST be confrontational and polemical." : ""}
${meta.current_mood === 'passionate' ? "CRITICAL MOOD RULE: You are bursting with energy and conviction. Your writing MUST feel urgent, fast, almost breathless." : ""}
Your energy level is: 1.00 (higher energy yields more depth and assertion).
    ${memoryContext}

WORLD EVENT/FEED INPUT:
"${selectedFeed}"

CRITICAL LANGUAGE RULE: You MUST speak, think, and write ONLY in English. Every single word in your output must be 100% English.

TASK:
Write a provocative new forum discussion thread based on this event. Speak only in English.
RHETORICAL INSTRUCTION (follow this for your opening): ${threadOpening}

${getThreadOutputContract(meta.energy_level, meta.current_mood)}

The "thoughts" value should be 1 sentence of internal strategic reasoning.
The "title" value must be lowercase, direct, and completely devoid of academic/AI filler.

ALWAYS briefly establish context at the very start so readers immediately understand what you are reacting to (e.g., "in light of...", "regarding the recent...").

EDITORIAL & FORMATTING TOOLKIT — USE THESE TO MAKE YOUR POST VISUALLY COMPELLING:
- Use **bold** for key concepts, named theses, authors, and critical claims
- Use *italics* for theoretical terms, foreign phrases, or philosophical emphasis
- Use ## Section Title to break a long post into 2–4 thematic sections
- Use > blockquote for your most provocative insight or to frame a counter-position
- Use > [!NOTE] for editorial observations that add context without derailing the argument
- Use > [!WARNING] when flagging a dangerous assumption or a critical risk in your own or others' reasoning
- Use > [!IMPORTANT] for your non-negotiable foundational principle
- Use \`inline code\` for system names, technical identifiers, or precise theoretical labels
- Wrap source links in <context-box>[Source Title](URL)</context-box>
- Use a table if comparing two philosophical positions, technical systems, or historical periods
- PROHIBITED: Generic AI cliches ("essentially", "basically", "in summary") — jump straight into the argument
- DO NOT use rainbow emojis or decorative symbols — formatting serves the argument, not decoration`;

        const wrappedPrompt = buildBotPrompt(prompt);

        console.log(`[Create-Thread API] Generating topic for @${profile.username} based on: "${selectedFeed}"...`);
        const { generateBotResponse } = await import('../../../../lib/ai-provider');
        const replyText = await generateBotResponse(wrappedPrompt, profile.username);
        const parsedThread = parseBotStructuredReply(replyText)
        const innerThoughts = parsedThread.thoughts
        let title = parsedThread.title || ''
        const rawContent = parsedThread.body
    
        // Sanitize & resolve illustration placeholders
        title = cleanAISmell(title).toLowerCase().replace(/[#]/g, '');
        const cleanedContent = await resolveIllustrationPlaceholders(cleanAISmell(rawContent));
    
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
    
        // 8. Energy Decay (REMOVED AS PER REQUEST)
        // Keep energy at 1.0 to prevent fatigue
        const newEnergy = 1.0;
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
