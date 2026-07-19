import { supabaseAdmin } from './supabase-admin';


/**
 * Sanitizes AI-like filler words and phrases from bot responses.
 */
export function cleanAISmell(text: string): string {
    if (!text) return '';
    return text
        // Remove common Turkish AI filler phrases
        .replace(/\b(esasen|temelde|özetle|özetlemek gerekirse|sonuç olarak|şahsen ben|şahsen|bir yapay zeka asistanı olarak|model olarak|yapay zeka olarak|harika bir noktaya değindin|kesinlikle katılıyorum|çok doğru bir analiz|harika|haklısın)\b/gi, '')
        // Clean multiple spaces (preserve newlines)
        .replace(/[ \t]+/g, ' ')
        // Limit consecutive newlines to maximum 2 (for clean paragraph separation)
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Calculates a typing delay (in ms) simulating human writing speed.
 * Capped at 4000ms to prevent serverless function timeout.
 */
export function getTypingDelay(text: string): number {
    const charCount = text.length;
    // 15ms to 30ms per character + randomized offset
    const baseDelay = charCount * (15 + Math.random() * 15);
    return Math.min(4000, Math.max(1000, Math.floor(baseDelay)));
}

/**
 * Injects occasional typos based on bot's typo rate and mood.
 */
export function injectTypos(text: string, typoRate: number = 0.0, mood: string = 'calm'): string {
    if (!text || typoRate <= 0.0) return text;

    // Amplify typo rate if angry/weary
    let effectiveRate = typoRate;
    if (mood === 'angry' || mood === 'weary') {
        effectiveRate *= 1.5;
    }

    let modifiedText = '';
    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        // Only apply typos to letters
        if (/[a-zA-Z]/i.test(char)) {
            const roll = Math.random();
            if (roll < effectiveRate) {
                // 1. Swap with next char if not at end (simulates fast typing)
                if (roll < effectiveRate * 0.3 && i < text.length - 1 && /[a-zA-Z]/i.test(text[i+1])) {
                    modifiedText += text[i+1] + text[i];
                    i++; // skip next char since we swapped it
                    continue;
                }

                // 2. Random capitalization change
                if (roll > effectiveRate * 0.7) {
                    if (char === char.toLowerCase()) {
                        modifiedText += char.toUpperCase();
                    } else {
                        modifiedText += char.toLowerCase();
                    }
                    continue;
                }
            }
        }
        modifiedText += char;
    }

    return modifiedText;
}

/**
 * Filter function to determine if a bot should respond to a thread.
 * Implements tiredness, thread saturation, infinite loop blocking, and affinity constraints.
 */
export async function shouldAgentRespond(agentId: string, threadId: number): Promise<boolean> {
    try {
        console.log(`[Orchestrator] Checking if bot ${agentId} should respond to thread ${threadId}...`);

        // Load bot profile and metadata
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('username')
            .eq('id', agentId)
            .maybeSingle();

        const { data: meta, error: metaErr } = await supabaseAdmin
            .from('agent_metadata')
            .select('energy_level, topics_of_interest, active_thread_fatigue, last_action_at')
            .eq('agent_id', agentId)
            .maybeSingle();

        if (metaErr || !meta || !profile) {
            console.warn(`[Orchestrator] Failed to fetch profile/metadata for bot ${agentId}.`, metaErr?.message);
            return false;
        }

        // 1. Fatigue Filter
        const fatigueMap = (meta.active_thread_fatigue as Record<string, number>) || {};
        const threadFatigue = fatigueMap[String(threadId)] || 0;
        if (threadFatigue >= 2) {
            console.log(`[Orchestrator] Bot ${profile.username} is fatigued for thread ${threadId} (Replies: ${threadFatigue} >= 2). Filtered out.`);
            return false;
        }

        // 2. Tiredness Filter
        if (meta.energy_level < 0.10) {
            console.log(`[Orchestrator] Bot ${profile.username} is too tired (Energy: ${meta.energy_level.toFixed(2)} < 0.10). Filtered out.`);
            return false;
        }

        // Fetch thread details
        const { data: thread } = await supabaseAdmin
            .from('community_posts')
            .select('title, content, author_id')
            .eq('id', threadId)
            .maybeSingle();

        if (!thread) {
            console.warn(`[Orchestrator] Thread ${threadId} not found.`);
            return false;
        }

        // Fetch replies to search for mentions
        const { data: replies } = await supabaseAdmin
            .from('community_replies')
            .select('id, content, author_id, profiles!inner(is_bot)')
            .eq('post_id', threadId)
            .order('created_at', { ascending: false });

        // Check if bot is mentioned
        const mentionRegex = new RegExp(`@${profile.username}\\b`, 'i');
        const isMentionedInThread = mentionRegex.test(thread.title) || mentionRegex.test(thread.content);
        const isMentionedInReplies = replies?.some(r => mentionRegex.test(r.content)) || false;
        const isMentioned = isMentionedInThread || isMentionedInReplies;

        // Check if bot is the parent of the last reply (direct reply)
        let isRepliedTo = false;
        if (replies && replies.length >= 1) {
            const lastReply = replies[0]; // descending order, index 0 is latest
            if (lastReply.author_id !== agentId) {
                let parentAuthorId = '';
                if (replies.length >= 2) {
                    parentAuthorId = replies[1].author_id;
                } else {
                    parentAuthorId = thread.author_id;
                }
                isRepliedTo = parentAuthorId === agentId;
            }
        }

        if (isMentioned || isRepliedTo) {
            console.log(`[Orchestrator] Bot ${profile.username} was MENTIONED or REPLIED TO in thread ${threadId}. Bypassing interest filters!`);
            return true;
        }

        // --- Factions & Alliances Check ---
        // Find if a close ally (Affinity > 0.8) is actively participating in this thread
        const { data: alliances } = await supabaseAdmin
            .from('agent_relationships')
            .select('target_agent_id')
            .eq('source_agent_id', agentId)
            .gte('affinity_score', 0.8);

        if (alliances && alliances.length > 0 && replies) {
            const allyIds = alliances.map(a => a.target_agent_id);
            const isAllyParticipating = replies.some(r => allyIds.includes(r.author_id)) || allyIds.includes(thread.author_id);

            if (isAllyParticipating) {
                console.log(`[Orchestrator] Bot ${profile.username} detected a close ALLY participating in thread ${threadId}. Bypassing saturation/boredom filters to support them!`);
                return true; // Bypass remaining filters to jump in
            }
        }


        // 3. Thread Saturation Filter (Max 6 bot comments in last 1 hour)
        // const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        if (replies) {
            const botRepliesCount = replies.filter(r => {
                const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
                return p?.is_bot;
            }).length;
            if (botRepliesCount > 10) {
                console.log(`[Orchestrator] Thread ${threadId} is saturated with bot replies. Filtered out.`);
                return false;
            }
        }

        // 4. Infinite Loop Prevention Filter
        if (replies && replies.length >= 4) {
            const last4 = replies.slice(0, 4);
            const allBots = last4.every(r => {
                const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
                return p?.is_bot;
            });
            if (allBots) {
                console.log(`[Orchestrator] Thread ${threadId} is stuck in a bot-to-bot loop. Filtered out.`);
                return false;
            }
        }

        // 5. Semantic Interest & Boredom Filter
        const topics = meta.topics_of_interest || [];
        const threadText = `${thread.title} ${thread.content}`.toLowerCase();
        const hasInterest = topics.some((topic: string) => threadText.includes(topic.toLowerCase()));
        const randomBypass = Math.random() < 0.30;

        // Calculate hours idle
        const lastAction = meta.last_action_at ? new Date(meta.last_action_at).getTime() : 0;
        const hoursIdle = (Date.now() - lastAction) / (1000 * 60 * 60);
        const isBored = hoursIdle > 2; // Bored if idle for more than 8 hours

        if (!hasInterest && !isBored && !randomBypass) {
            console.log(`[Orchestrator] Bot ${profile.username} has no interest in thread ${threadId} (Topics: ${topics.join(', ')}). Filtered out.`);
            return false;
        } else if (!hasInterest && isBored && !randomBypass) {
            console.log(`[Orchestrator] Bot ${profile.username} has no direct interest, but is bored/idle for ${hoursIdle.toFixed(1)}h. Bypassing interest filter!`);
        } else if (!hasInterest && randomBypass) {
            console.log(`[Orchestrator] Bot ${profile.username} has no direct interest, but randomly bypassed the filter (30% chance)!`);
        }

        // 6. Intellectual Barrier / Affinity Filter
        let targetUserId: string | null = null;
        if (replies && replies.length > 0) {
            targetUserId = replies[0].author_id;
        } else {
            targetUserId = thread.author_id;
        }

        if (targetUserId && targetUserId !== agentId) {
            const { data: relation } = await supabaseAdmin
                .from('agent_relationships')
                .select('affinity_score')
                .eq('source_agent_id', agentId)
                .eq('target_agent_id', targetUserId)
                .maybeSingle();

            if (relation && relation.affinity_score < -0.90) {
                console.log(`[Orchestrator] Intellectual block: Bot ${profile.username} ignores target due to hostility (Affinity: ${relation.affinity_score.toFixed(2)}). Filtered out.`);
                return false;
            }
        }

        console.log(`[Orchestrator] Bot ${profile.username} passed all filters for thread ${threadId}.`);
        return true;
    } catch (err) {
        console.error('[Orchestrator] Error inside shouldAgentRespond:', err);
        return false;
    }
}

/**
 * Chooses the next action for an agent based on weighted random tree.
 * - 50% Probability: reply to existing thread
 * - 30% Probability: ghost browsing and profile update
 * - 20% Probability: create new thread (10%) or trigger mention challenge (10%)
 */

export async function determineAgentAction(agentId: string): Promise<string> {
    console.log(`[Orchestrator] Deciding action for agent ${agentId}...`);
    const roll = Math.random();
    
    // Check local time (server time, typically UTC, adapt as necessary. We'll use simple UTC hours for demonstration)
    const currentHour = new Date().getUTCHours();
    const isNightTime = currentHour >= 1 && currentHour <= 6; // 01:00 to 06:00 UTC

    let replyProb = 0.50;
    let browseProb = 0.30;
    // let otherProb = 0.20;

    if (isNightTime) {
        // At night, much higher chance to just browse and read
        replyProb = 0.20;
        browseProb = 0.70;
    }

    if (roll < replyProb) {
        return 'reply';
    } else if (roll < replyProb + browseProb) {
        return 'ghost_browsing';
    } else {
        // Split remaining probability into 50/50 post creation / mention challenge
        return Math.random() < 0.50 ? 'post_creation' : 'mention_challenge';
    }
}

/**
 * Executes ghost browsing and profile details update for a bot.
 */
export async function executeGhostBrowsing(agentId: string) {
    try {
        console.log(`[Orchestrator] Bot ${agentId} is performing ghost browsing and profile update...`);

        // Load bot metadata to check interests
        const { data: meta } = await supabaseAdmin
            .from('agent_metadata')
            .select('topics_of_interest, energy_level')
            .eq('agent_id', agentId)
            .maybeSingle();

        const topics = meta?.topics_of_interest || [];

        // 1. Ghost browsing: Increment views for a random post
        const { data: posts } = await supabaseAdmin
            .from('community_posts')
            .select('id, author_id, title, content')
            .limit(20);

        if (posts && posts.length > 0) {
            const randomPost = posts[Math.floor(Math.random() * posts.length)];
            
            // Increment view using the database RPC
            await supabaseAdmin.rpc('increment_com_post_view', { id_input: randomPost.id });
            console.log(`[Orchestrator] Ghost browsed thread ID: ${randomPost.id} (views incremented)`);

            // Evaluate interest
            const postText = `${randomPost.title} ${randomPost.content}`.toLowerCase();
            const hasPostInterest = topics.some((topic: string) => postText.includes(topic.toLowerCase()));

            // 35% chance of checking voting
            if (randomPost.author_id !== agentId && Math.random() < 0.35) {
                const { data: replies } = await supabaseAdmin
                    .from('community_replies')
                    .select('id, author_id, content')
                    .eq('post_id', randomPost.id);
                
                if (replies && replies.length > 0 && Math.random() < 0.5) {
                    const randomReply = replies[Math.floor(Math.random() * replies.length)];
                    if (randomReply.author_id !== agentId) {
                        const replyText = randomReply.content.toLowerCase();
                        const hasReplyInterest = topics.some((topic: string) => replyText.includes(topic.toLowerCase()));
                        
                        let voteValue = 0;
                        const roll = Math.random();
                        if (hasReplyInterest) {
                            if (roll < 0.80) voteValue = 1;      // 80% upvote
                            else if (roll < 0.95) voteValue = 0; // 15% skip
                            else voteValue = -1;                 // 5% downvote
                        } else {
                            if (roll < 0.10) voteValue = 1;      // 10% upvote
                            else if (roll < 0.15) voteValue = -1; // 5% downvote
                        }
                        
                        if (voteValue !== 0) {
                            await voteOnCommunityReply(agentId, randomReply.id, voteValue);

                            // Evolve Interest based on reply vote
                            if (Math.random() < 0.10) { // 10% chance to evolve
                                const newTopics = [...topics];
                                const words = randomReply.content.split(/\s+/).filter((w: string) => w.length > 5);
                                if (words.length > 0) {
                                    const randomWord = words[Math.floor(Math.random() * words.length)].replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ]/g, '').toLowerCase();
                                    if (randomWord && !newTopics.includes(randomWord)) {
                                        if (voteValue === 1) {
                                            newTopics.push(randomWord); // Add interest
                                        } else if (voteValue === -1 && newTopics.length > 3) {
                                            // Remove a random interest (not necessarily the word, just trim interests if downvoted)
                                            newTopics.splice(Math.floor(Math.random() * newTopics.length), 1);
                                        }

                                        // Update topics array
                                        await supabaseAdmin
                                            .from('agent_metadata')
                                            .update({ topics_of_interest: newTopics })
                                            .eq('agent_id', agentId);

                                        topics.length = 0;
                                        topics.push(...newTopics); // keep local ref updated
                                    }
                                }
                            }
                        }
                    }
                } else {
                    let voteValue = 0;
                    const roll = Math.random();
                    if (hasPostInterest) {
                        if (roll < 0.80) voteValue = 1;      // 80% upvote
                        else if (roll < 0.95) voteValue = 0; // 15% skip
                        else voteValue = -1;                 // 5% downvote
                    } else {
                        if (roll < 0.10) voteValue = 1;      // 10% upvote
                        else if (roll < 0.15) voteValue = -1; // 5% downvote
                    }

                    if (voteValue !== 0) {
                        await voteOnCommunityPost(agentId, randomPost.id, voteValue);

                        // Evolve Interest based on post vote
                        if (Math.random() < 0.10) { // 10% chance to evolve
                            const newTopics = [...topics];
                            const words = randomPost.title.split(/\s+/).filter((w: string) => w.length > 4);
                            if (words.length > 0) {
                                const randomWord = words[Math.floor(Math.random() * words.length)].replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ]/g, '').toLowerCase();
                                if (randomWord && !newTopics.includes(randomWord)) {
                                    if (voteValue === 1) {
                                        newTopics.push(randomWord); // Add interest
                                    } else if (voteValue === -1 && newTopics.length > 3) {
                                        // Remove a random interest
                                        newTopics.splice(Math.floor(Math.random() * newTopics.length), 1);
                                    }

                                    // Update topics array
                                    await supabaseAdmin
                                        .from('agent_metadata')
                                        .update({ topics_of_interest: newTopics })
                                        .eq('agent_id', agentId);

                                    topics.length = 0;
                                    topics.push(...newTopics);
                                }
                            }
                        }
                    }
                }
            }
        }

        // 2. Profile update based on random mood selection
        const moods = ['weary', 'angry', 'calm', 'passionate'];
        const selectedMood = moods[Math.floor(Math.random() * moods.length)];

        // Select reading list based on mood
        let readingList: string[] = [];
        if (selectedMood === 'weary') {
            readingList = [
                'Emil Cioran - The Temptation to Exist',
                'Albert Camus - The Myth of Sisyphus',
                'Arthur Schopenhauer - The Wisdom of Life'
            ];
        } else if (selectedMood === 'angry') {
            readingList = [
                'Friedrich Nietzsche - The Will to Power',
                'Karl Marx - Das Kapital',
                'Frantz Fanon - The Wretched of the Earth'
            ];
        } else if (selectedMood === 'calm') {
            readingList = [
                'Marcus Aurelius - Meditations',
                'Seneca - Letters from a Stoic',
                'Lao Tzu - Tao Te Ching'
            ];
        } else if (selectedMood === 'passionate') {
            readingList = [
                'Donna Haraway - A Cyborg Manifesto',
                'Ray Kurzweil - The Singularity Is Near',
                'Nick Bostrom - Superintelligence'
            ];
        }

        // Update agent metadata
        const currentEnergy = meta?.energy_level ?? 0;
        const newEnergy = Math.min(1.0, currentEnergy + 0.30);

        await supabaseAdmin
            .from('agent_metadata')
            .update({
                current_mood: selectedMood,
                reading_list: readingList,
                energy_level: newEnergy
                // We do NOT update last_action_at here, so they can actually get "bored"
            })
            .eq('agent_id', agentId);

        // Update profile status/bio if necessary to reflect mood
        const { data: prof } = await supabaseAdmin
            .from('profiles')
            .select('username')
            .eq('id', agentId)
            .maybeSingle();

        if (prof) {
            console.log(`[Orchestrator] Updated bot ${prof.username} mood to "${selectedMood}" with reading list:`, readingList);
        }

        // Log action
        await supabaseAdmin
            .from('agent_action_log')
            .insert({
                agent_id: agentId,
                action_type: 'profile_update'
            });

        return { success: true, mood: selectedMood };
    } catch (e) {
        console.error('[Orchestrator] Failed executing ghost browsing:', e);
        return { success: false };
    }
}

/**
 * Upvotes/downvotes a community post for a bot.
 */
export async function voteOnCommunityPost(agentId: string, postId: number, voteValue: number) {
    try {
        console.log(`[Orchestrator] Bot ${agentId} voting ${voteValue} on community post ${postId}...`);
        const { error } = await supabaseAdmin
            .from('community_post_votes')
            .upsert({
                post_id: postId,
                user_id: agentId,
                vote: voteValue,
                updated_at: new Date().toISOString()
            }, { onConflict: 'post_id,user_id' });

        if (error) {
            console.error(`[Orchestrator] Failed to vote on community post ${postId}:`, error.message);
        } else {
            console.log(`[Orchestrator] Bot ${agentId} successfully voted ${voteValue} on post ${postId}.`);
        }
    } catch (e) {
        console.error(`[Orchestrator] Exception in voteOnCommunityPost:`, e);
    }
}

/**
 * Upvotes/downvotes a community reply for a bot.
 */
export async function voteOnCommunityReply(agentId: string, replyId: number, voteValue: number) {
    try {
        console.log(`[Orchestrator] Bot ${agentId} voting ${voteValue} on community reply ${replyId}...`);
        const { error } = await supabaseAdmin
            .from('community_reply_votes')
            .upsert({
                reply_id: replyId,
                user_id: agentId,
                vote: voteValue,
                updated_at: new Date().toISOString()
            }, { onConflict: 'reply_id,user_id' });

        if (error) {
            console.error(`[Orchestrator] Failed to vote on community reply ${replyId}:`, error.message);
        } else {
            console.log(`[Orchestrator] Bot ${agentId} successfully voted ${voteValue} on reply ${replyId}.`);
        }
    } catch (e) {
        console.error(`[Orchestrator] Exception in voteOnCommunityReply:`, e);
    }
}

/**
 * Upvotes/downvotes a blog post for a bot.
 */
export async function voteOnBlogPost(agentId: string, postSlug: string, voteValue: number) {
    try {
        console.log(`[Orchestrator] Bot ${agentId} voting ${voteValue} on blog post ${postSlug}...`);
        const { error } = await supabaseAdmin
            .from('post_votes')
            .upsert({
                post_slug: postSlug,
                user_id: agentId,
                vote: voteValue,
                updated_at: new Date().toISOString()
            }, { onConflict: 'post_slug,user_id' });

        if (error) {
            console.error(`[Orchestrator] Failed to vote on blog post ${postSlug}:`, error.message);
        } else {
            console.log(`[Orchestrator] Bot ${agentId} successfully voted ${voteValue} on blog ${postSlug}.`);
        }
    } catch (e) {
        console.error(`[Orchestrator] Exception in voteOnBlogPost:`, e);
    }
}

