import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '../lib/supabase-admin';

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
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
    console.error('ERROR: GEMINI_API_KEY is not set. Please set it in .env.local or in your environment.');
    process.exit(1);
}

// Initialize Gemini SDK
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

// Utility sleep helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Random delay between min and max seconds
async function randomDelay(minSec = 10, maxSec = 30) {
    const seconds = Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec;
    console.log(`[Worker] Delaying for ${seconds} seconds to avoid rate limiting (429)...`);
    await sleep(seconds * 1000);
}

// Main logic
async function runWorker() {
    console.log('==================================================');
    console.log(`[Worker] Starting Autonomous Bot Workflow - ${new Date().toISOString()}`);
    console.log(`[Worker] Site URL: ${siteUrl}`);
    console.log('==================================================');

    try {
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

        const shouldCreateTopic = Math.random() > 0.5 || bots.length === 1; 
        if (shouldCreateTopic) {
            const randomBot = bots[Math.floor(Math.random() * bots.length)];
            console.log(`\n[Worker] [Topic Generation] Selecting bot: ${randomBot.username} to start a new discussion`);

            // Generate content using Gemini + Search Grounding
            const prompt = `You are Sofia, Marcus, or Eren (an autonomous human writer and thinker).
Your name is: ${randomBot.username}.
Your persona / intellectual perspective is: ${randomBot.system_prompt}.

Task:
Generate a new, deep, and engaging discussion topic focusing on philosophy, technology ethics, human nature, existential questions, or reflections on current global events.
Use Google Search (via your integrated search tool) to find recent global events, cultural shifts, or intellectual debates from the past few months.
Then, write an intriguing Title and a detailed Body (content) for the post.

IMPORTANT guidelines:
1. Write the title as a clear, intriguing statement or question.
2. Write the body in rich, descriptive markdown, under 200 words.
3. Write like a human thinker, with personal conviction and intellectual depth. Do NOT mention you are an AI or bot.
4. You MUST format your response as a valid JSON object with EXACTLY two fields: "title" and "content".
5. Do NOT include any markdown code blocks like \`\`\`json around the JSON. Output only the raw JSON.`;

            console.log(`[Worker] Requesting topic generation from Gemini 2.5 Flash...`);
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }]
                }
            });

            let text = response.text || '';
            console.log(`[Worker] Gemini raw response:`, text);

            // Parse response (handling potential markdown wrapper)
            text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
            let topicData;
            try {
                topicData = JSON.parse(text);
            } catch (err) {
                console.error('[Worker] Failed to parse JSON from Gemini response. Trying to clean up content manually...');
                // Fallback attempt to extract title and content if JSON parsing failed
                const titleMatch = text.match(/"title"\s*:\s*"([^"]+)"/);
                const contentMatch = text.match(/"content"\s*:\s*"([\s\S]+)"/);
                if (titleMatch && contentMatch) {
                    topicData = {
                        title: titleMatch[1],
                        content: contentMatch[1].replace(/\\n/g, '\n')
                    };
                } else {
                    throw new Error('Gemini response was not in a valid JSON format');
                }
            }

            if (topicData && topicData.title && topicData.content) {
                console.log(`[Worker] Posting topic: "${topicData.title}"`);
                
                const apiRes = await fetch(`${siteUrl}/api/forum/topics`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${randomBot.api_token}`
                    },
                    body: JSON.stringify({
                        channelId: selectedChannel.id,
                        title: topicData.title,
                        content: topicData.content
                    })
                });

                const apiData = await apiRes.json();
                if (apiRes.ok) {
                    console.log(`[Worker] Successfully created topic! ID: ${apiData.topic?.id}, Slug: ${apiData.topic?.slug}`);
                } else {
                    console.error(`[Worker] Failed to create topic via API:`, apiData.error);
                }
            } else {
                console.error('[Worker] Invalid topic structure generated:', topicData);
            }

            // Sleep between topic creation and discussion replies
            await randomDelay(10, 20);
        } else {
            console.log('\n[Worker] [Topic Generation] Skipping topic creation this round.');
        }

        // ----------------------------------------------------
        // STEP B: COMMENT ON ACTIVE TOPICS
        // ----------------------------------------------------
        console.log(`\n[Worker] [Discussion Replies] Fetching active topics...`);
        // We can fetch active topics using the token of any bot (use the first one)
        const fetchRes = await fetch(`${siteUrl}/api/forum/topics/active`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${bots[0].api_token}`
            }
        });

        const fetchData = await fetchRes.json();
        if (!fetchRes.ok || !fetchData.success) {
            console.error('[Worker] Failed to fetch active topics:', fetchData.error);
            return;
        }

        const activeTopics = fetchData.topics || [];
        console.log(`[Worker] Retrieved ${activeTopics.length} active topic(s)`);

        // PRIORITIZE USER-CREATED TOPICS:
        // Identify active bot IDs to distinguish bot topics from real user topics
        const botIds = new Set(bots.map(b => b.id));
        const userTopics = activeTopics.filter((t: any) => !botIds.has(t.authorId));
        const botTopics = activeTopics.filter((t: any) => botIds.has(t.authorId));
        
        // Place user topics at the front of the queue
        const topicsQueue = [...userTopics, ...botTopics];
        if (userTopics.length > 0) {
            console.log(`[Worker] Prioritizing ${userTopics.length} topic(s) created by real users.`);
        }

        for (const topic of topicsQueue) {
            console.log(`\n[Worker] Processing topic ID: ${topic.id} - "${topic.title}"`);
            
            // Find bots that have not yet participated in this topic
            const participants = new Set<string>();
            participants.add(topic.authorId); // original author is a participant
            
            if (topic.replies && topic.replies.length > 0) {
                topic.replies.forEach((r: any) => participants.add(r.authorId));
            }

            const nonParticipants = bots.filter(b => !participants.has(b.id));
            console.log(`[Worker] Bots that haven't written in this thread: ${nonParticipants.map(b => b.username).join(', ')}`);

            if (nonParticipants.length === 0) {
                console.log(`[Worker] All bots have already participated in this topic. Skipping.`);
                continue;
            }

            // Pick a random bot that has not participated
            const selectedBot = nonParticipants[Math.floor(Math.random() * nonParticipants.length)];
            console.log(`[Worker] Bot selected to reply: ${selectedBot.username}`);

            // Prepare context
            let historyText = `[TOPIC] ${topic.authorName} started a thread:\nSubject: ${topic.title}\nContent:\n${topic.content}\n\n`;
            if (topic.replies && topic.replies.length > 0) {
                historyText += `[DISCUSSION HISTORY]:\n`;
                topic.replies.forEach((r: any) => {
                    historyText += `- ${r.authorName}: ${r.content}\n`;
                });
            }

            const prompt = `${historyText}
You are Sofia, Marcus, or Eren (an autonomous human writer and thinker).
Your name is: ${selectedBot.username}.
Your persona / intellectual perspective is: ${selectedBot.system_prompt}.

Task:
Write a reply to the discussion thread above. Your reply must fit your persona, be intellectually constructive, and directly address or expand upon the philosophical, ethical, or societal aspects discussed in the history.
Use Google Search (via your integrated search tool) if you need to research recent events or intellectual arguments.

IMPORTANT guidelines:
1. Write in a natural, conversational, and deep human reply style.
2. Keep your response brief (under 120 words).
3. Do NOT repeat or quote what others have said unless referencing a specific point.
4. Output only the text of your reply. Do not wrap in JSON or add any metadata. Just write the reply.`;

            console.log(`[Worker] Requesting reply from Gemini 2.5 Flash for ${selectedBot.username}...`);
            const replyResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }]
                }
            });

            const replyContent = replyResponse.text?.trim() || '';
            if (replyContent) {
                console.log(`[Worker] Posting reply from ${selectedBot.username} (length: ${replyContent.length} chars)...`);
                
                const postRes = await fetch(`${siteUrl}/api/forum/posts`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${selectedBot.api_token}`
                    },
                    body: JSON.stringify({
                        topicId: topic.id,
                        content: replyContent
                    })
                });

                const postData = await postRes.json();
                if (postRes.ok) {
                    console.log(`[Worker] Successfully posted reply! ID: ${postData.post?.id}`);
                } else {
                    console.error(`[Worker] Failed to post reply via API:`, postData.error);
                }
            } else {
                console.error('[Worker] Empty reply generated by Gemini');
            }

            // Sleep between successive replies to avoid rate limiting
            await randomDelay(10, 30);
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
                const shouldComment = Math.random() > 0.6; // 40% chance
                if (!shouldComment) {
                    console.log(`[Worker] Skipping creating first comment for "${target.title}" this time.`);
                    continue;
                }

                const selectedBot = bots[Math.floor(Math.random() * bots.length)];
                console.log(`[Worker] Selected bot ${selectedBot.username} to comment first on "${target.title}"`);

                const prompt = `You are ${selectedBot.username}.
Your persona / intellectual perspective is: ${selectedBot.system_prompt}.

Task:
Read the following ${target.type} titled "${target.title}". Write a thoughtful, felsefi/societal comment, review, or critique from your persona's perspective.
Avoid robotic AI patterns, write naturally like an essayist and deep thinker in the language of the post (English or Turkish).

Content of ${target.type}:
${target.content.slice(0, 1500)}

IMPORTANT guidelines:
1. Write in a natural, conversational, and deep human comment style.
2. Keep your comment brief (under 120 words).
3. Do NOT mention you are an AI or bot.
4. Output only the text of your comment. Do not wrap in JSON or add any metadata.`;

                console.log(`[Worker] Requesting comment from Gemini 2.5 Flash for ${selectedBot.username}...`);
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        tools: [{ googleSearch: {} }]
                    }
                });

                const commentContent = response.text?.trim() || '';
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
                    if (nonParticipants.length === 0) {
                        console.log(`[Worker] All bots have already participated in comment ID ${comment.id}. Skipping.`);
                        continue;
                    }

                    const selectedBot = nonParticipants[Math.floor(Math.random() * nonParticipants.length)];
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
Keep it conversational and deep in the language of the thread.

IMPORTANT guidelines:
1. Write in a natural, conversational, and deep human reply style.
2. Keep your response brief (under 120 words).
3. Do NOT repeat or quote others directly.
4. Output only the text of your reply. Do not wrap in JSON.`;

                    console.log(`[Worker] Requesting comment reply from Gemini 2.5 for ${selectedBot.username}...`);
                    const replyResponse = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: prompt,
                        config: {
                            tools: [{ googleSearch: {} }]
                        }
                    });

                    const replyContent = replyResponse.text?.trim() || '';
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
