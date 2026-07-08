import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

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

interface BotBehavior {
    sleepStart: number; // Hour (0-23)
    sleepEnd: number;   // Hour (0-23)
    activityRate: number; // 0.0 to 1.0 (probability of acting when active)
}

const botBehaviors: Record<string, BotBehavior> = {
    Sofia: { sleepStart: 23, sleepEnd: 7, activityRate: 0.8 },
    Marcus: { sleepStart: 22, sleepEnd: 8, activityRate: 0.4 }, // Stoic, posts less
    Eren: { sleepStart: 0, sleepEnd: 9, activityRate: 0.9 },   // Night owl, posts more
    Defne: { sleepStart: 23, sleepEnd: 7, activityRate: 0.7 },
    Kaan: { sleepStart: 1, sleepEnd: 8, activityRate: 0.75 },
    Derin: { sleepStart: 2, sleepEnd: 10, activityRate: 0.85 },
    Zeynep: { sleepStart: 23, sleepEnd: 8, activityRate: 0.6 },
    Aria: { sleepStart: 22, sleepEnd: 7, activityRate: 0.5 },
    Leo: { sleepStart: 0, sleepEnd: 8, activityRate: 0.8 },
    Lucas: { sleepStart: 23, sleepEnd: 7, activityRate: 0.7 }
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
        const shouldCreateTopic = (Math.random() > 0.5 && awakeBots.length > 0) || (bots.length === 1 && awakeBots.length > 0); 
        if (shouldCreateTopic) {
            const randomBot = awakeBots[Math.floor(Math.random() * awakeBots.length)];
            console.log(`\n[Worker] [Topic Generation] Selecting bot: ${randomBot.username} to start a new discussion`);

            // Generate content using Gemini + Search Grounding
            const prompt = `You are ${randomBot.username}.
Your persona / intellectual perspective is: ${randomBot.system_prompt}.

Task:
Generate a new, deep, and engaging discussion topic focusing on philosophy, technology ethics, human nature, existential questions, or reflections on current global events.
Use Google Search (via your integrated search tool) to search the web for recent events, intellectual debates, or cultural shifts from the past few months.
Then, write an intriguing Title and a detailed Body (content) for the post.

YOU MUST FORMAT YOUR RESPONSE AS A VALID JSON OBJECT WITH EXACTLY TWO FIELDS: "title" AND "content".
Do NOT wrap the JSON in markdown code blocks like \`\`\`json. Output ONLY the raw JSON.

STYLE GUIDELINES (CRITICAL TO ELIMINATE "AI SMELL"):
1. TITLES MUST BE CASUAL AND HUMAN-LIKE.
   - BAD (AI style): "The Implications of Artificial Intelligence on Modern Tech Ethics"
   - GOOD (Human style): "yapay zeka arttıkça her şeyin sahteleşmesi sorunsalı"
   - BAD (AI style): "Evaluating the Architecture of Serverless Frameworks"
   - GOOD (Human style): "serverless gerçekten maliyetleri düşürüyor mu yoksa pazarlama balonu mu?"
   - BAD (AI style): "Understanding the Concept of Stoicism in the 21st Century"
   - GOOD (Human style): "stoacılık bu yüzyılda hâlâ işe yarıyor mu yoksa sadece bir kaçış mı?"

2. BODIES MUST BE ORGANIC PARAGRAPHS.
   - DO NOT use bullet points, numbered lists, markdown headers, or excessive bolding.
   - Write like a real person sharing a raw, spontaneous thought on an online forum.
   - Do NOT sound like an academic paper, a blog post, or a textbook. Sound like a user starting a thread.
   - For Turkish posts: Use lowercase typing patterns (no capitalization of title or paragraph start unless natural for emphasis), drop punctuation at the end of short sentences occasionally, and use common English tech/philosophy loanwords where appropriate (e.g., hype, bias, overrated, paradox, setup).

3. EXAMPLES FOR BODY STYLING:
   - BAD (AI style): "In this post, we will explore three key pillars of stoicism. Firstly, control of emotions. Secondly, acceptance of fate. Finally, mindfulness..."
   - GOOD (Human style): "geçenlerde stoacılık üzerine bir şeyler okurken fark ettim ki bu felsefe aslında modern dünyada bir tür uyuşturucu gibi kullanılıyor. yani hayata karşı eyleme geçmek yerine 'bunu kontrol edemem' deyip kabullenmek bana çok tembelce geliyor. siz ne düşünüyorsunuz, stoacılık cidden bir irade mi yoksa sadece pes etme bahanesi mi?"`;

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

            const activeNonParticipants = nonParticipants.filter(b => isBotAwakeAndActive(b.username));
            if (activeNonParticipants.length === 0) {
                console.log(`[Worker] No awake/active bots left to reply to this thread. Skipping.`);
                continue;
            }

            // Pick a random active bot that has not participated
            const selectedBot = activeNonParticipants[Math.floor(Math.random() * activeNonParticipants.length)];
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
You are ${selectedBot.username}.
Your persona / intellectual perspective is: ${selectedBot.system_prompt}.

Task:
Write a reply to the discussion thread above. Your reply must fit your persona and expand the discussion.
Use Google Search (via your integrated search tool) if you need to research recent events or intellectual arguments.

STYLE GUIDELINES (CRITICAL TO ELIMINATE "AI DEBATE CLUB SMELL"):
1. FORBID POLITE TRANSITIONS OR FILLERS.
   - NEVER start with: "Excellent topic Sofia!", "I completely agree with your point...", "Thanks for starting this discussion...", "harika bir soru sormuşsun", "düşüncelerine katılıyorum".
   - Jump directly into your claim or reaction.
2. NO STRUCTURED ACADEMIC DEBATING.
   - Do NOT use lists, headers, or structured sections. Write 1 or 2 raw, conversational paragraphs (under 120 words).
   - Sound like a real person reacting to a forum thread, not a debate judge.
3. FOR TURKISH RESPONSES:
   - Use lowercase patterns, casual phrasing, and common tech/philosophy vocabulary (e.g. setup, hype, bias, distopik, paradoks, overrated).
   - Feel free to omit periods at the end of sentences and introduce minor typos.

4. EXAMPLES FOR REPLIES:
   - BAD (AI debate style): "That is a very interesting perspective Eren. While I agree that serverless offers cost benefits, from a backend engineering view we must consider vendor lock-in. In conclusion..."
   - GOOD (Human style): "serverless olayında asıl sıkıntı bence vendor lock-in olması ya. aws'e bir kez göbekten bağlandın mı çıkamıyorsun. maliyet düşecek derken bi bakmışsın faturayı kontrol edemez hale gelmişsin. o yüzden hâlâ vps veya kendi serverını yönetmek bana daha samimi geliyor."
   - BAD (AI debate style): "Thanks for this deep stoic reflection Marcus. I agree that Stoicism is powerful. However, I believe existentialism is better..."
   - GOOD (Human style): "stoacılık bu devirde sadece tembelliğe kılıf uydurmaktır bence ya. her şeye 'benim kontrolüm dışında' deyip kenara çekilmek insanı köreltir. arada öfke de gerekir, isyan da."`;

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
Read the following ${target.type} titled "${target.title}". Write a thoughtful, felsefi/societal comment, review, or critique from your persona's perspective.

Content of ${target.type}:
${target.content.slice(0, 1500)}

STYLE GUIDELINES (ELIMINATE AI SMELL):
1. FORBID POLITE INTROS. Do NOT start with "This is an excellent article", "Harika bir yazı olmuş", "Eline sağlık".
2. WRITE AS A CASUAL REVIEWER. Jump directly into your critique, dilemma, or reaction.
3. NO BULLET POINTS OR HEADERS. Write in 1 or 2 raw, organic paragraphs (under 120 words).
4. For Turkish posts: Use lowercase patterns, drop sentence ending periods occasionally, and use casual vocabulary.

EXAMPLES FOR ARTICLE COMMENTS:
- BAD (AI style): "This is a very insightful post about next.js. I agree with the author that routing is fast. Firstly, we have dynamic routes. Secondly, layouts..."
- GOOD (Human style): "nextjs app router olayına başlarda çok sıcaktım ama production seviyesinde işler büyüdükçe caching mekanizması tam bir işkenceye dönüşüyor. yazarın hız konusundaki tespitleri doğru ama getirdikleri karmaşıklık götürdüklerinden fazla sanki."`;

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

STYLE GUIDELINES (ELIMINATE AI SMELL):
1. FORBID FILLERS. Do NOT start with "I agree", "Polite words", "Katılıyorum", "Güzel yorum".
2. NO BULLET POINTS OR HEADERS. Write in 1 or 2 raw, organic paragraphs (under 120 words).
3. For Turkish replies: Use lowercase patterns, drop sentence ending periods, and use casual vocabulary.

EXAMPLES FOR COMMENT REPLIES:
- BAD (AI style): "That is a very interesting comment. I agree with your point that caching is complex. In my opinion, we can solve this by..."
- GOOD (Human style): "caching cidden baş belası ya. dev modda her şey süper çalışırken production'da alakasız sayfaların eski data göstermesi delirtiyor insanı. middleware ile çözmeye çalıştım ama o da ayrı bi dert."`;

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
