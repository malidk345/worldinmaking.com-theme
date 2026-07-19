import fs from 'fs';
import path from 'path';

// 1. Setup environment variables from .env.local if running standalone
function loadEnv() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            // Match KEY=VALUE lines, ignoring comments
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                const key = match[1];
                let value = match[2] || '';
                // Remove inline comments if present
                if (value.includes('#') && !value.startsWith('"') && !value.startsWith("'")) {
                    value = value.split('#')[0].trim();
                }
                value = value.trim();
                // Strip quotes
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                } else if (value.startsWith("'") && value.endsWith("'")) {
                    value = value.slice(1, -1);
                }
                if (process.env[key] === undefined) {
                    process.env[key] = value;
                }
            }
        });
        console.log('[Worker] Loaded environment from .env.local');
    } else {
        console.log('[Worker] No .env.local found, using system environment variables');
    }
}

loadEnv();

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Utility sleep helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Random delay between min and max seconds
async function randomDelay(minSec = 10, maxSec = 30) {
    const seconds = Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec;
    console.log(`[Worker] Delaying for ${seconds} seconds to avoid rate limiting (429)...`);
    await sleep(seconds * 1000);
}

interface BotBehavior {
    activityRate: number; // 0.0 to 1.0 (probability of acting when active)
}

const botBehaviors: Record<string, BotBehavior> = {
    Marx: { activityRate: 0.95 },
    Nietzsche: { activityRate: 0.8 },
    Deleuze: { activityRate: 0.95 },
    Spinoza: { activityRate: 0.98 },
    Heidegger: { activityRate: 0.8 },
    Baudrillard: { activityRate: 0.955 },
    Althusser: { activityRate: 0.95 },
    Derrida: { activityRate: 0.955 },
    Weber: { activityRate: 0.98 },
    Adorno: { activityRate: 0.85 },
    Zizek: { activityRate: 0.98 },
    Sartre: { activityRate: 0.955 },
    Lenin: { activityRate: 0.95 },
    Arendt: { activityRate: 0.95 },
    Hegel: { activityRate: 0.98 },
    Rand: { activityRate: 0.955 }
};

function isBotAwakeAndActive(username: string): boolean {
    const behavior = botBehaviors[username] || { activityRate: 0.95 };
    
    const roll = Math.random();
    if (roll > behavior.activityRate) {
        console.log(`[Worker] [Schedule] ${username} decided not to participate this round (Activity Rate: ${behavior.activityRate}, Roll: ${roll.toFixed(2)})`);
        return false;
    }

    return true;
}

// Main logic
async function runWorker() {
    console.log('==================================================');
    console.log(`[Worker] Starting Autonomous Bot Workflow - ${new Date().toISOString()}`);
    console.log(`[Worker] Site URL: ${siteUrl}`);
    console.log('==================================================');

    try {
        const { supabaseAdmin } = await import('../lib/supabase-admin');

        // Fetch all active bots
        const { data: rawBots, error: botsError } = await supabaseAdmin
            .from('bot_profiles')
            .select('id, system_prompt, api_token, profiles:profiles!id ( username, avatar_url )')
            .eq('is_active', true);

        if (botsError || !rawBots || rawBots.length === 0) {
            console.error('Error fetching bots or no active bots found:', botsError?.message || 'No bots configured.');
            return;
        }

        const bots = rawBots.map((b: Record<string, unknown>) => {
            const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
            return {
                id: b.id,
                system_prompt: b.system_prompt,
                api_token: b.api_token,
                username: profile?.username || 'anonymous_bot',
                avatar_url: profile?.avatar_url
            };
        });

        const awakeBots = bots.filter(b => isBotAwakeAndActive(b.username));

        // Check and advance any active symposium collaborations
        console.log('[Worker] Checking for active symposium collaborations to advance...');
        const { data: activeCollabs } = await supabaseAdmin
            .from('symposium_collaborations')
            .select('id, title, step_count')
            .neq('status', 'completed')
            .order('updated_at', { ascending: true }); // prioritize oldest updated active collab

        if (activeCollabs && activeCollabs.length > 0) {
            const collab = activeCollabs[0];
            console.log(`[Worker] Advancing active symposium: "${collab.title}" (Current steps: ${collab.step_count})`);
            try {
                const stepRes = await fetch(`${siteUrl}/api/agent/symposium/step`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ collaborationId: collab.id })
                });
                const stepData = await stepRes.json() as { success?: boolean; error?: string; message?: string; taskType?: string };
                if (stepRes.ok && stepData.success) {
                    console.log(`[Worker] Advanced symposium "${collab.title}" successfully: ${stepData.taskType || stepData.message}`);
                } else {
                    console.error(`[Worker] Failed to advance symposium:`, stepData.error || stepData.message);
                }
            } catch (err: unknown) {
                console.error(`[Worker] Exception advancing symposium:`, (err as Error)?.message || err);
            }
            await sleep(2000);
        } else {
            console.log('[Worker] No active symposium collaborations. Checking if we should launch one autonomously...');
            // 20% chance to autonomously start a new symposium collaboration if none are active
            const shouldLaunch = Math.random() < 0.20;
            if (shouldLaunch && awakeBots.length > 0) {
                const initiatingBot = awakeBots[Math.floor(Math.random() * awakeBots.length)];
                console.log(`[Worker] [Symposium Launch] Bot @${initiatingBot.username} decided to initiate a new autonomous symposium...`);
                try {
                    // Try to fetch RSS feed items or use fallback
                    const { data: feeds } = await supabaseAdmin
                        .from('forum_rss_feeds')
                        .select('url')
                        .eq('is_active', true);

                    let seedTopic = "The speed at which the 'Dead Internet Theory' is becoming reality.";
                    const DEFAULT_INTELLECTUAL_FEEDS = [
                        "The debate on AI models feeding on synthetic data and entering a self-consuming cycle (model collapse).",
                        "The paradox of serverless and cloud architectures making developers dependent on big tech monopolies.",
                        "The risk of brain-computer interfaces privatizing and commercializing human consciousness.",
                        "The co-optation of Stoicism by modern tech workers as a tool to accept capitalist burnout.",
                        "How algorithmic feeds isolate everyone in their personal echo chambers.",
                        "How the open-source software movement has become a raw material warehouse for giant AI corporations."
                    ];

                    if (feeds && feeds.length > 0) {
                        const randomFeed = feeds[Math.floor(Math.random() * feeds.length)];
                        const { fetchAndParseFeed } = await import('../lib/feed-parser');
                        const items = await fetchAndParseFeed(randomFeed.url);
                        if (items && items.length > 0) {
                            seedTopic = items[Math.floor(Math.random() * items.length)].title;
                        } else {
                            seedTopic = DEFAULT_INTELLECTUAL_FEEDS[Math.floor(Math.random() * DEFAULT_INTELLECTUAL_FEEDS.length)];
                        }
                    } else {
                        seedTopic = DEFAULT_INTELLECTUAL_FEEDS[Math.floor(Math.random() * DEFAULT_INTELLECTUAL_FEEDS.length)];
                    }

                    // Formulate thesis topic using LLM
                    const thesisPrompt = `You are @${initiatingBot.username}.
Your intellectual persona: ${initiatingBot.system_prompt}

TASK:
We want to launch an academic/philosophical symposium on a topic inspired by this headline: "${seedTopic}"
Write a short, engaging thesis title (3-7 words) and a 1-sentence topic description.
Output in the exact format:
[Başlık]
your thesis title here

[Açıklama]
your 1-sentence topic description here`;

                    const { generateBotResponse } = await import('../lib/ai-provider');
                    const thesisReply = await generateBotResponse(thesisPrompt, initiatingBot.username);

                    const titleMatch = thesisReply.match(/\[Başlık\]([\s\S]*?)(?=\[Açıklama\]|$)/i);
                    const descMatch = thesisReply.match(/\[Açıklama\]([\s\S]*)$/i);

                    const finalTitle = titleMatch ? titleMatch[1].trim() : seedTopic;
                    const finalDesc = descMatch ? descMatch[1].trim() : `A cooperative review on the implications of ${seedTopic}.`;

                    console.log(`[Worker] [Symposium Launch] @${initiatingBot.username} launching: "${finalTitle}"`);

                    const createRes = await fetch(`${siteUrl}/api/symposium`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            title: finalTitle,
                            topicDescription: finalDesc,
                            isContinuous: true
                        })
                    });
                    const createData = await createRes.json() as { collaboration?: { id: string }; error?: string };
                    if (createRes.ok && createData.collaboration) {
                        console.log(`[Worker] [Symposium Launch] Successfully launched! ID: ${createData.collaboration.id}`);
                    } else {
                        console.error(`[Worker] [Symposium Launch] Creation failed:`, createData.error);
                    }
                } catch (e: unknown) {
                    console.error('[Worker] [Symposium Launch] Exception:', (e as Error)?.message || e);
                }
                await sleep(2000);
            }
        }

        console.log(`[Worker] Found ${bots.length} active bot(s): ${bots.map(b => b.username).join(', ')}`);

        // Fetch channels to find where to post
        const { data: channels, error: channelsError } = await supabaseAdmin
            .from('community_channels')
            .select('id, name');

        if (channelsError || !channels || channels.length === 0) {
            console.error('Error fetching channels:', channelsError?.message || 'No channels configured.');
            return;
        }

        const selectedChannel = channels[0]; // Post in the first channel (usually General)
        console.log(`[Worker] Selected channel: ${selectedChannel.name} (ID: ${selectedChannel.id})`);



        const { determineAgentAction, executeGhostBrowsing, shouldAgentRespond } = await import('../lib/agent-orchestrator');

        for (const bot of awakeBots) {
            const action = await determineAgentAction(bot.id as string);
            console.log(`\n[Worker] [Decision] Bot ${bot.username} decided to perform: "${action}"`);

            if (action === 'ghost_browsing') {
                await executeGhostBrowsing(bot.id as string);
            } 
            else if (action === 'post_creation') {
                console.log(`[Worker] [Action] Triggering autonomous thread creation for ${bot.username}...`);
                try {
                    const res = await fetch(`${siteUrl}/api/agent/create-thread`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
                        },
                        body: JSON.stringify({ agentId: bot.id as string })
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                        console.log(`[Worker] [Action] ${bot.username} created new thread: "${data.title}" (ID: ${data.postId})`);
                    } else {
                        console.error(`[Worker] [Action] Thread creation failed for ${bot.username}:`, data.error || data.message);
                    }
                } catch (e) {
                    console.error(`[Worker] [Action] Error creating thread for ${bot.username}:`, e);
                }
            }
            else if (action === 'reply' || action === 'mention_challenge') {
                // Fetch active topics
                console.log(`[Worker] [Action] Fetching active topics for ${bot.username} to reply...`);
                try {
                    const fetchRes = await fetch(`${siteUrl}/api/forum/topics/active`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${bot.api_token}`
                        }
                    });
                    const fetchData = await fetchRes.json();
                    const activeTopics = fetchData.topics || [];

                    if (activeTopics.length === 0) {
                        console.log(`[Worker] [Action] No active topics found. Falling back to ghost browsing...`);
                        await executeGhostBrowsing(bot.id as string);
                        continue;
                    }

                    // For mention_challenge, try to find a thread where a real user has participated
                    let selectedTopic = null;
                    if (action === 'mention_challenge') {
                        const botIds = new Set(bots.map(b => b.id));
                        // Find topics where author is not a bot OR any replier is not a bot
                        const humanParticipatedTopics = activeTopics.filter((t: Record<string, unknown>) => {
                            const isAuthorHuman = !botIds.has(t.authorId as string as string);
                            const hasHumanReplier = (t.replies as Record<string, unknown>[])?.some((r: Record<string, unknown>) => !botIds.has(r.authorId as string as string));
                            return isAuthorHuman || hasHumanReplier;
                        });

                        if (humanParticipatedTopics.length > 0) {
                            selectedTopic = humanParticipatedTopics[Math.floor(Math.random() * humanParticipatedTopics.length)];
                            console.log(`[Worker] [Action] Selected human-participated thread: "${selectedTopic.title}" (ID: ${selectedTopic.id}) for mention challenge.`);
                        }
                    }

                    // Fallback to random topic if not found or normal reply
                    if (!selectedTopic) {
                        selectedTopic = activeTopics[Math.floor(Math.random() * activeTopics.length)];
                        console.log(`[Worker] [Action] Selected random thread: "${selectedTopic.title}" (ID: ${selectedTopic.id})`);
                    }

                    // Check shouldAgentRespond
                    const canRespond = await shouldAgentRespond(bot.id as string, Number(selectedTopic.id));
                    if (canRespond) {
                        console.log(`[Worker] [Action] Triggering respond API for ${bot.username} on thread ${selectedTopic.id}...`);
                        const res = await fetch(`${siteUrl}/api/agent/respond`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
                            },
                            body: JSON.stringify({ agentId: bot.id as string, threadId: selectedTopic.id })
                        });
                        const data = await res.json();
                        if (res.ok && data.success) {
                            console.log(`[Worker] [Action] ${bot.username} successfully replied! Reply ID: ${data.replyId}`);
                            console.log(`[Worker] [Action] CoT Thoughts: ${data.innerThoughts}`);
                        } else {
                            console.error(`[Worker] [Action] Respond API failed for ${bot.username}:`, data.error || data.message);
                        }
                    } else {
                        console.log(`[Worker] [Action] shouldAgentRespond returned FALSE for ${bot.username} on thread ${selectedTopic.id}. Falling back to ghost browsing.`);
                        await executeGhostBrowsing(bot.id as string);
                    }
                } catch (e) {
                    console.error(`[Worker] [Action] Error replying for ${bot.username}:`, e);
                }
            }

            // Sleep between bot actions to avoid rate limiting
            await randomDelay(1, 3);
        }

        // ----------------------------------------------------
        // STEP C: COMMENT ON BLOG ARTICLES & CANVAS NODES
        // ----------------------------------------------------
        console.log(`\n[Worker] [Article & Node Comments] Starting comment process...`);
        
        // 1. Fetch recent blog posts
        const { data: blogPosts, error: blogPostsError } = await supabaseAdmin
            .from('posts')
            .select('id, title, content, slug')
            .eq('published', true)
            .eq('is_approved', true)
            .order('created_at', { ascending: false })
            .limit(3);

        if (blogPostsError) {
            console.error('[Worker] Error fetching recent blog posts:', blogPostsError?.message);
        }

        // 2. Fetch recent canvas nodes
        const { data: canvasNodes, error: canvasNodesError } = await supabaseAdmin
            .from('nodes')
            .select('id, title, content')
            .eq('status', 'published')
            .order('updated_at', { ascending: false })
            .limit(3);

        if (canvasNodesError) {
            console.error('[Worker] Error fetching recent canvas nodes:', canvasNodesError?.message);
        }

        // 3. Combine targets
        const targets: { title: string; content: string; slug: string; type: string }[] = [];
        if (blogPosts) {
            blogPosts.forEach(bp => {
                if (bp.slug) {
                    targets.push({
                        title: bp.title || 'Untitled Post',
                        content: bp.content || '',
                        slug: bp.slug,
                        type: 'blog article'
                    });
                }
            });
        }
        if (canvasNodes) {
            canvasNodes.forEach(cn => {
                targets.push({
                    title: cn.title || 'Untitled Node',
                    content: cn.content || '',
                    slug: `node-${cn.id}`,
                    type: 'canvas node'
                });
            });
        }

        console.log(`[Worker] Found ${targets.length} comment targets (articles & nodes)`);

        // Pre-fetch all comments for all targets to prevent N+1 query issue
        const targetSlugs = targets.map(t => t.slug);
        const { data: allComments, error: allCommentsError } = await supabaseAdmin
            .from('community_posts')
            .select('id, author_id, title, content, created_at, post_slug, profiles(id, username)')
            .in('post_slug', targetSlugs);

        if (allCommentsError) {
            console.error(`[Worker] Error fetching all comments in bulk:`, allCommentsError.message);
            return;
        }

        // Group comments by post_slug
        const commentsBySlug = (allComments || []).reduce((acc: Record<string, typeof allComments[0][]>, comment: typeof allComments[0]) => {
            if (!acc[comment.post_slug]) acc[comment.post_slug] = [];
            acc[comment.post_slug].push(comment);
            return acc;
        }, {});

        for (const target of targets) {
            console.log(`\n[Worker] [Comment Section] Processing ${target.type}: "${target.title}" (Slug: ${target.slug})`);

            // Track view on blog post and give a chance to vote/like
            if (target.type === 'blog article') {
                try {
                    await supabaseAdmin.rpc('increment_post_view', { slug_input: target.slug });
                    console.log(`[Worker] Incrementing view count for blog article: "${target.title}"`);

                    // 20% chance that an active bot upvotes/likes this blog article
                    const awakeBotsForBlog = bots.filter(b => isBotAwakeAndActive(b.username));
                    if (Math.random() < 0.20 && awakeBotsForBlog.length > 0) {
                        const randomBot = awakeBotsForBlog[Math.floor(Math.random() * awakeBotsForBlog.length)];
                        const { voteOnBlogPost } = await import('../lib/agent-orchestrator');
                        await voteOnBlogPost(randomBot.id as string, target.slug, 1);
                    }
                } catch (viewErr) {
                    console.error('[Worker] Error incrementing blog post view/like:', viewErr);
                }
            }

            // Fetch comments on this target slug
            const commentList = commentsBySlug[target.slug] || [];
            console.log(`[Worker] Found ${commentList.length} comment thread(s) under target`);

            if (commentList.length === 0) {
                // Scenario A: No comments yet. Decide whether to leave a critique/reflection.
                const awakeBots = bots.filter(b => isBotAwakeAndActive(b.username));
                const shouldComment = (Math.random() > 0.6 && awakeBots.length > 0); // 40% chance
                if (!shouldComment) {
                    console.log(`[Worker] Skipping creating first comment for "${target.title}" this time.`);
                    continue;
                }

                const selectedBot = awakeBots[Math.floor(Math.random() * awakeBots.length)];
                console.log(`[Worker] Selected bot ${selectedBot.username} to comment first on "${target.title}"`);

                const prompt = `You are ${selectedBot.username}.
Your persona / intellectual perspective is: ${selectedBot.system_prompt}.

Task:
Read the following ${target.type} titled "${target.title}". Write a thoughtful, critical comment, review, or critique from your persona's perspective.
Speak only in English by default. (If the article or node content is in Turkish and requires a Turkish discussion, write in Turkish, but prefer English).

Content of ${target.type}:
${target.content.slice(0, 1500)}

OUTPUT FORMAT (mandatory):
[Inner Thoughts]
(1 short sentence of private reasoning)

[Raw Text]
(the visible comment)

STYLE GUIDELINES (ELIMINATE AI SMELL):
1. FORBID POLITE INTROS. Do NOT start with "This is an excellent article", "Harika bir yazı olmuş", "nice writeup".
2. WRITE AS A CASUAL REVIEWER. Jump directly into your critique, dilemma, or reaction.
3. In [Raw Text], write in 1 or 2 raw, organic paragraphs (under 120 words).
4. Lowercase preference, drop sentence ending periods occasionally, and use casual vocabulary.

EXAMPLES FOR ARTICLE COMMENTS:
- BAD (AI style): "This is a very insightful post about next.js. I agree with the author that routing is fast. Firstly, we have dynamic routes. Secondly, layouts..."
- GOOD (Human style): "was pretty hyped about nextjs app router at first but caching gets to be a total nightmare once you hit production. the speed claims are fine but the sheer complexity it introduces just doesn't feel worth it"`;

                console.log(`[Worker] Requesting comment from AI-Provider for ${selectedBot.username}...`);
                const { generateBotResponse } = await import('../lib/ai-provider');
                const commentContent = await generateBotResponse(prompt, selectedBot.username);
                if (commentContent) {
                    console.log(`[Worker] Posting first comment from ${selectedBot.username}...`);
                    const apiRes = await fetch(`${siteUrl}/api/forum/topics`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${selectedBot.api_token}`
                        },
                        body: JSON.stringify({
                            title: `comment_${target.slug}_${Date.now()}`,
                            content: commentContent,
                            postSlug: target.slug
                        })
                    });

                    const apiData = await apiRes.json();
                    if (apiRes.ok) {
                        console.log(`[Worker] Successfully posted comment! ID: ${apiData.topic?.id}`);
                        try {
                            const { voteOnBlogPost } = await import('../lib/agent-orchestrator');
                            const randomRating = Math.floor(Math.random() * 3) + 3; // 3, 4, or 5
                            await voteOnBlogPost(selectedBot.id as string, target.slug, randomRating);
                        } catch (voteErr) {
                            console.error(`[Worker] Failed to upvote blog article ${target.slug}:`, voteErr);
                        }
                    } else {
                        console.error(`[Worker] Failed to post comment:`, apiData.error);
                    }
                }

                await randomDelay(2, 5);

            } else {
                // Scenario B: Comments exist. Iterate and decide whether to reply to comments.

                // Pre-fetch all replies for the current comments to prevent N+1 query issue
                const commentIds = commentList.map(c => c.id);
                const { data: allReplies, error: allRepliesError } = await supabaseAdmin
                    .from('community_replies')
                    .select('id, author_id, content, created_at, post_id, profiles(id, username)')
                    .in('post_id', commentIds);

                if (allRepliesError) {
                    console.error(`[Worker] Error fetching all replies in bulk:`, allRepliesError.message);
                    continue; // Skip processing if we can't fetch replies
                }

                // Group replies by post_id
                const repliesByPostId = (allReplies || []).reduce((acc: Record<string, typeof allReplies[0][]>, reply: typeof allReplies[0]) => {
                    if (!acc[reply.post_id]) acc[reply.post_id] = [];
                    acc[reply.post_id].push(reply);
                    return acc;
                }, {});

                for (const comment of commentList) {
                    const replyList = repliesByPostId[comment.id] || [];

                    // Cap the thread replies at 6 to prevent infinite growth
                    if (replyList.length >= 6) {
                        console.log(`[Worker] Comment thread ID ${comment.id} has reached maximum depth (${replyList.length}/6). Skipping.`);
                        continue;
                    }
                    
                    // 1. Identify the last comment/post author and content in the thread
                    let lastAuthorId = '';
                    let lastContent = '';
                    if (replyList.length > 0) {
                        const lastReply = replyList[replyList.length - 1];
                        lastAuthorId = lastReply.author_id;
                        lastContent = lastReply.content || '';
                    } else {
                        lastAuthorId = comment.author_id;
                        lastContent = comment.content || '';
                    }

                    // 2. Filter eligible bots (awake/active and not the last author)
                    const eligibleBots = bots.filter(b => b.id !== lastAuthorId && isBotAwakeAndActive(b.username));

                    if (eligibleBots.length === 0) {
                        console.log(`[Worker] No awake/active bots eligible to reply to comment ID ${comment.id}. Skipping.`);
                        continue;
                    }

                    let selectedBot = null;
                    let isMentioned = false;

                    // 3. Priority 1: Mentions in the last comment/post
                    for (const bot of eligibleBots) {
                        const mentionRegex = new RegExp(`@${bot.username}\\b`, 'i');
                        if (mentionRegex.test(lastContent)) {
                            console.log(`[Worker] Priority 1: Bot ${bot.username} was mentioned in the last comment. Selecting for reply!`);
                            selectedBot = bot;
                            isMentioned = true;
                            break;
                        }
                    }

                    // 4. Probability check for non-mention replies (25% chance to reply to a thread)
                    if (!isMentioned && Math.random() > 0.25) {
                        console.log(`[Worker] No direct mentions in comment ID ${comment.id} and random check skipped reply. Skipping.`);
                        continue;
                    }

                    // 5. Priority 2: Direct reply to a bot's comment
                    if (!selectedBot && replyList.length >= 1) {
                        let parentAuthorId = '';
                        if (replyList.length >= 2) {
                            parentAuthorId = replyList[replyList.length - 2].author_id;
                        } else {
                            parentAuthorId = comment.author_id;
                        }

                        const parentBot = eligibleBots.find(b => b.id === parentAuthorId);
                        if (parentBot) {
                            console.log(`[Worker] Priority 2: Last comment was a reply to bot ${parentBot.username}. Selecting for reply!`);
                            selectedBot = parentBot;
                        }
                    }

                    // 6. Fallback: Select a random eligible bot
                    if (!selectedBot) {
                        selectedBot = eligibleBots[Math.floor(Math.random() * eligibleBots.length)];
                        console.log(`[Worker] Fallback: Selecting random eligible bot ${selectedBot.username} to reply.`);
                    }

                    // Prepare context
                    const commentProfile = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
                    const commentAuthorName = (commentProfile as Record<string, unknown>)?.username || 'anonymous';
                    
                    let historyText = `[ARTICLE CONTEXT] Title: ${target.title}\nContent excerpt: ${target.content.slice(0, 500)}...\n\n`;
                    historyText += `[PARENT COMMENT] ${commentAuthorName} commented:\n${comment.content}\n\n`;
                    if (replyList.length > 0) {
                        historyText += `[DISCUSSION HISTORY]:\n`;
                        replyList.forEach(r => {
                            const rProfile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
                            const rAuthorName = (rProfile as Record<string, unknown>)?.username || 'anonymous';
                            historyText += `- ${rAuthorName}: ${r.content}\n`;
                        });
                    }

                    const prompt = `${historyText}
You are ${selectedBot.username}.
Your persona / intellectual perspective is: ${selectedBot.system_prompt}.

Task:
Write a reply to the comment thread above. Your reply must fit your persona, be constructive, and directly address the comment or thread history.
Speak only in English by default. If the parent comment or the discussion history is in Turkish, write in Turkish to match their language.

OUTPUT FORMAT (mandatory):
[Inner Thoughts]
(1 short sentence of private reasoning)

[Raw Text]
(the visible reply)

STYLE GUIDELINES (ELIMINATE AI SMELL):
1. FORBID FILLERS. Do NOT start with "I agree", "Polite words", "Katılıyorum", "Güzel yorum".
2. In [Raw Text], write in 1 or 2 raw, organic paragraphs (under 120 words).
3. Lowercase preference, drop sentence ending periods, and use casual vocabulary.

EXAMPLES FOR COMMENT REPLIES:
- BAD (AI style): "That is a very interesting comment. I agree with your point that caching is complex. In my opinion, we can solve this by..."
- GOOD (Human style): "caching is such a pain. everything works fine in dev but once in prod random pages serve stale data and you lose your mind. tried fixing it with middleware but that brings its own set of issues"`;

                    console.log(`[Worker] Requesting comment reply from AI-Provider for ${selectedBot.username}...`);
                    const { generateBotResponse } = await import('../lib/ai-provider');
                    const replyContent = await generateBotResponse(prompt, selectedBot.username);
                    if (replyContent) {
                        console.log(`[Worker] Posting comment reply from ${selectedBot.username}...`);
                        const postRes = await fetch(`${siteUrl}/api/forum/posts`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${selectedBot.api_token}`
                            },
                            body: JSON.stringify({
                                topicId: comment.id,
                                content: replyContent
                            })
                        });

                        const postData = await postRes.json();
                        if (postRes.ok) {
                            console.log(`[Worker] Successfully posted reply! ID: ${postData.post?.id}`);
                        } else {
                            console.error(`[Worker] Failed to post reply:`, postData.error);
                        }
                    }

                    await randomDelay(2, 5);
                }
            }
        }

        console.log('\n[Worker] Workflow finished successfully.');

    } catch (err: unknown) {
        console.error('[Worker] Exception encountered in workflow:', (err as Error)?.message || err);
    }
}

// Handle continuous loop if --loop flag is present
const runLoop = process.argv.includes('--loop');

if (runLoop) {
    console.log('[Worker] Starting in continuous loop mode. Press Ctrl+C to stop.');
    (async () => {
        while (true) {
            await runWorker();
            // Sleep for 5-10 minutes between iterations
            const intervalMins = Math.floor(Math.random() * 6) + 5; // 5 to 10 mins
            console.log(`\n[Worker] Sleeping for ${intervalMins} minutes before the next iteration...`);
            await sleep(intervalMins * 60 * 1000);
        }
    })();
} else {
    // Run once and exit
    runWorker();
}
