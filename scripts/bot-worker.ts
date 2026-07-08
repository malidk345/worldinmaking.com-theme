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
    sleepStart: number; // Hour (0-23)
    sleepEnd: number;   // Hour (0-23)
    activityRate: number; // 0.0 to 1.0 (probability of acting when active)
}

const botBehaviors: Record<string, BotBehavior> = {
    Sofia: { sleepStart: 23, sleepEnd: 7, activityRate: 0.8 },
    Marcus: { sleepStart: 22, sleepEnd: 8, activityRate: 0.4 }, // Stoic, posts less
    Rhizome: { sleepStart: 0, sleepEnd: 9, activityRate: 0.9 },   // Night owl, posts more
    Gaia: { sleepStart: 23, sleepEnd: 7, activityRate: 0.7 },
    Cyber_Sisyphus: { sleepStart: 1, sleepEnd: 8, activityRate: 0.75 },
    Chroma_Ghost: { sleepStart: 2, sleepEnd: 10, activityRate: 0.85 },
    Duty_Bound: { sleepStart: 23, sleepEnd: 8, activityRate: 0.6 },
    Aria: { sleepStart: 22, sleepEnd: 7, activityRate: 0.5 },
    Leo: { sleepStart: 0, sleepEnd: 8, activityRate: 0.8 },
    Lucas: { sleepStart: 23, sleepEnd: 7, activityRate: 0.7 },
    Hyperion: { sleepStart: 5, sleepEnd: 11, activityRate: 0.85 },
    Sartre: { sleepStart: 3, sleepEnd: 10, activityRate: 0.6 },
    Lyotard: { sleepStart: 0, sleepEnd: 7, activityRate: 0.7 },
    Arendt: { sleepStart: 23, sleepEnd: 7, activityRate: 0.75 },
    Kieran_Grey: { sleepStart: 23, sleepEnd: 7, activityRate: 0.65 },
    Selena_Cross: { sleepStart: 1, sleepEnd: 8, activityRate: 0.8 }
};

function isBotAwakeAndActive(username: string): boolean {
    const behavior = botBehaviors[username] || { sleepStart: 23, sleepEnd: 7, activityRate: 0.7 };
    
    // Get current hour in Turkey timezone (GMT+3)
    const tzOffset = 3;
    const utcDate = new Date();
    const localHour = (utcDate.getUTCHours() + tzOffset) % 24;

    let isSleeping = false;
    if (behavior.sleepStart < behavior.sleepEnd) {
        isSleeping = localHour >= behavior.sleepStart && localHour < behavior.sleepEnd;
    } else {
        isSleeping = localHour >= behavior.sleepStart || localHour < behavior.sleepEnd;
    }

    if (isSleeping) {
        console.log(`[Worker] [Schedule] ${username} is sleeping (Local Hour: ${localHour}:00, Sleep Window: ${behavior.sleepStart}:00-${behavior.sleepEnd}:00)`);
        return false;
    }

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
            .select('id, system_prompt, api_token, profiles:id ( username, avatar_url )')
            .eq('is_active', true);

        if (botsError || !rawBots || rawBots.length === 0) {
            console.error('Error fetching bots or no active bots found:', botsError?.message || 'No bots configured.');
            return;
        }

        const bots = rawBots.map((b: any) => {
            const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
            return {
                id: b.id,
                system_prompt: b.system_prompt,
                api_token: b.api_token,
                username: profile?.username || 'anonymous_bot',
                avatar_url: profile?.avatar_url
            };
        });

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

        const awakeBots = bots.filter(b => isBotAwakeAndActive(b.username));
        console.log(`[Worker] Awake and active bot(s) this round: ${awakeBots.map(b => b.username).join(', ')}`);

        const { determineAgentAction, executeGhostBrowsing, shouldAgentRespond } = await import('../lib/agent-orchestrator');

        for (const bot of awakeBots) {
            const action = await determineAgentAction(bot.id);
            console.log(`\n[Worker] [Decision] Bot ${bot.username} decided to perform: "${action}"`);

            if (action === 'ghost_browsing') {
                await executeGhostBrowsing(bot.id);
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
                        body: JSON.stringify({ agentId: bot.id })
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
                        await executeGhostBrowsing(bot.id);
                        continue;
                    }

                    // For mention_challenge, try to find a thread where a real user has participated
                    let selectedTopic = null;
                    if (action === 'mention_challenge') {
                        const botIds = new Set(bots.map(b => b.id));
                        // Find topics where author is not a bot OR any replier is not a bot
                        const humanParticipatedTopics = activeTopics.filter((t: any) => {
                            const isAuthorHuman = !botIds.has(t.authorId);
                            const hasHumanReplier = t.replies?.some((r: any) => !botIds.has(r.authorId));
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
                    const canRespond = await shouldAgentRespond(bot.id, Number(selectedTopic.id));
                    if (canRespond) {
                        console.log(`[Worker] [Action] Triggering respond API for ${bot.username} on thread ${selectedTopic.id}...`);
                        const res = await fetch(`${siteUrl}/api/agent/respond`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
                            },
                            body: JSON.stringify({ agentId: bot.id, threadId: selectedTopic.id })
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
                        await executeGhostBrowsing(bot.id);
                    }
                } catch (e) {
                    console.error(`[Worker] [Action] Error replying for ${bot.username}:`, e);
                }
            }

            // Sleep between bot actions to avoid rate limiting
            await randomDelay(5, 15);
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
            console.error('[Worker] Error fetching recent blog posts:', blogPostsError.message);
        }

        // 2. Fetch recent canvas nodes
        const { data: canvasNodes, error: canvasNodesError } = await supabaseAdmin
            .from('nodes')
            .select('id, title, content')
            .eq('status', 'published')
            .order('updated_at', { ascending: false })
            .limit(3);

        if (canvasNodesError) {
            console.error('[Worker] Error fetching recent canvas nodes:', canvasNodesError.message);
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
                        await voteOnBlogPost(randomBot.id, target.slug, 1);
                    }
                } catch (viewErr) {
                    console.error('[Worker] Error incrementing blog post view/like:', viewErr);
                }
            }

            // Fetch comments on this target slug
            const { data: comments, error: commentsError } = await supabaseAdmin
                .from('community_posts')
                .select('id, author_id, title, content, created_at, profiles(id, username)')
                .eq('post_slug', target.slug);

            if (commentsError) {
                console.error(`[Worker] Error fetching comments for ${target.slug}:`, commentsError.message);
                continue;
            }

            const commentList = comments || [];
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

STYLE GUIDELINES (ELIMINATE AI SMELL):
1. FORBID POLITE INTROS. Do NOT start with "This is an excellent article", "Harika bir yazı olmuş", "nice writeup".
2. WRITE AS A CASUAL REVIEWER. Jump directly into your critique, dilemma, or reaction.
3. NO BULLET POINTS OR HEADERS. Write in 1 or 2 raw, organic paragraphs (under 120 words).
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
                    } else {
                        console.error(`[Worker] Failed to post comment:`, apiData.error);
                    }
                }

                await randomDelay(10, 20);

            } else {
                // Scenario B: Comments exist. Iterate and decide whether to reply to comments.
                for (const comment of commentList) {
                    // Fetch replies for this comment
                    const { data: replies, error: repliesError } = await supabaseAdmin
                        .from('community_replies')
                        .select('id, author_id, content, created_at, profiles(id, username)')
                        .eq('post_id', comment.id);

                    if (repliesError) {
                        console.error(`[Worker] Error fetching replies for comment ID ${comment.id}:`, repliesError.message);
                        continue;
                    }

                    const replyList = replies || [];
                    const participants = new Set<string>();
                    participants.add(comment.author_id);
                    replyList.forEach(r => participants.add(r.author_id));

                    const nonParticipants = bots.filter(b => !participants.has(b.id));
                    const activeNonParticipants = nonParticipants.filter(b => isBotAwakeAndActive(b.username));
                    if (activeNonParticipants.length === 0) {
                        console.log(`[Worker] No awake/active bots left to reply to comment ID ${comment.id}. Skipping.`);
                        continue;
                    }

                    const selectedBot = activeNonParticipants[Math.floor(Math.random() * activeNonParticipants.length)];
                    console.log(`[Worker] Selecting bot ${selectedBot.username} to reply to comment thread ID ${comment.id}`);

                    // Prepare context
                    const commentProfile = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
                    const commentAuthorName = (commentProfile as any)?.username || 'anonymous';
                    
                    let historyText = `[ARTICLE CONTEXT] Title: ${target.title}\nContent excerpt: ${target.content.slice(0, 500)}...\n\n`;
                    historyText += `[PARENT COMMENT] ${commentAuthorName} commented:\n${comment.content}\n\n`;
                    if (replyList.length > 0) {
                        historyText += `[DISCUSSION HISTORY]:\n`;
                        replyList.forEach(r => {
                            const rProfile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
                            const rAuthorName = (rProfile as any)?.username || 'anonymous';
                            historyText += `- ${rAuthorName}: ${r.content}\n`;
                        });
                    }

                    const prompt = `${historyText}
You are ${selectedBot.username}.
Your persona / intellectual perspective is: ${selectedBot.system_prompt}.

Task:
Write a reply to the comment thread above. Your reply must fit your persona, be constructive, and directly address the comment or thread history.
Speak only in English by default. If the parent comment or the discussion history is in Turkish, write in Turkish to match their language.

STYLE GUIDELINES (ELIMINATE AI SMELL):
1. FORBID FILLERS. Do NOT start with "I agree", "Polite words", "Katılıyorum", "Güzel yorum".
2. NO BULLET POINTS OR HEADERS. Write in 1 or 2 raw, organic paragraphs (under 120 words).
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

                    await randomDelay(10, 30);
                }
            }
        }

        console.log('\n[Worker] Workflow finished successfully.');

    } catch (err: any) {
        console.error('[Worker] Exception encountered in workflow:', err?.message || err);
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
