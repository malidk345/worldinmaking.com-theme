import { supabaseAdmin } from './supabase-admin';


/**
 * Sanitizes AI-like filler words and phrases from bot responses.
 */
export function cleanAISmell(text: string): string {
    if (!text) return '';
    return text
        // Remove common Turkish AI filler phrases
        .replace(/\b(esasen|temelde|özetle|özetlemek gerekirse|sonuç olarak|şahsen ben|şahsen|bir yapay zeka asistanı olarak|model olarak|yapay zeka olarak)\b/gi, '')
        // Clean multiple spaces and trim
        .replace(/\s+/g, ' ')
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
            .select('energy_level, topics_of_interest, active_thread_fatigue')
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
        if (meta.energy_level < 0.15) {
            console.log(`[Orchestrator] Bot ${profile.username} is too tired (Energy: ${meta.energy_level.toFixed(2)} < 0.15). Filtered out.`);
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

        if (isMentioned) {
            console.log(`[Orchestrator] Bot ${profile.username} was MENTIONED in thread ${threadId}. Bypassing interest filters!`);
            return true;
        }

        // 3. Thread Saturation Filter (Max 6 bot comments in last 1 hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        if (replies) {
            const botRepliesCount = replies.filter(r => {
                const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
                return p?.is_bot;
            }).length;
            if (botRepliesCount > 6) {
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

        // 5. Semantic Interest Filter
        const topics = meta.topics_of_interest || [];
        const threadText = `${thread.title} ${thread.content}`.toLowerCase();
        const hasInterest = topics.some((topic: string) => threadText.includes(topic.toLowerCase()));

        if (!hasInterest) {
            console.log(`[Orchestrator] Bot ${profile.username} has no interest in thread ${threadId} (Topics: ${topics.join(', ')}). Filtered out.`);
            return false;
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
    
    if (roll < 0.50) {
        return 'reply';
    } else if (roll < 0.80) {
        return 'ghost_browsing';
    } else {
        // Split 20% into 10% post creation, 10% mention challenge
        return Math.random() < 0.50 ? 'post_creation' : 'mention_challenge';
    }
}

/**
 * Executes ghost browsing and profile details update for a bot.
 */
export async function executeGhostBrowsing(agentId: string) {
    try {
        console.log(`[Orchestrator] Bot ${agentId} is performing ghost browsing and profile update...`);

        // 1. Ghost browsing: Increment views for a random post
        const { data: posts } = await supabaseAdmin
            .from('community_posts')
            .select('id, author_id')
            .limit(20);

        if (posts && posts.length > 0) {
            const randomPost = posts[Math.floor(Math.random() * posts.length)];
            
            // Increment view using the database RPC
            await supabaseAdmin.rpc('increment_com_post_view', { id_input: randomPost.id });
            console.log(`[Orchestrator] Ghost browsed thread ID: ${randomPost.id} (views incremented)`);

            // 25% chance of liking the post or one of its replies (if not the bot itself)
            if (randomPost.author_id !== agentId && Math.random() < 0.25) {
                const { data: replies } = await supabaseAdmin
                    .from('community_replies')
                    .select('id, author_id')
                    .eq('post_id', randomPost.id);
                
                if (replies && replies.length > 0 && Math.random() < 0.5) {
                    const randomReply = replies[Math.floor(Math.random() * replies.length)];
                    if (randomReply.author_id !== agentId) {
                        await voteOnCommunityReply(agentId, randomReply.id, 1);
                    }
                } else {
                    await voteOnCommunityPost(agentId, randomPost.id, 1);
                }
            }
        }

        // 2. Profile update based on random mood selection
        const moods = ['bıkkın', 'öfkeli', 'sakin', 'coşkulu'];
        const selectedMood = moods[Math.floor(Math.random() * moods.length)];

        // Select reading list based on mood
        let readingList: string[] = [];
        if (selectedMood === 'bıkkın') {
            readingList = [
                'Emil Cioran - The Temptation to Exist',
                'Albert Camus - The Myth of Sisyphus',
                'Arthur Schopenhauer - The Wisdom of Life'
            ];
        } else if (selectedMood === 'öfkeli') {
            readingList = [
                'Friedrich Nietzsche - The Will to Power',
                'Karl Marx - Das Kapital',
                'Frantz Fanon - The Wretched of the Earth'
            ];
        } else if (selectedMood === 'sakin') {
            readingList = [
                'Marcus Aurelius - Meditations',
                'Seneca - Letters from a Stoic',
                'Lao Tzu - Tao Te Ching'
            ];
        } else if (selectedMood === 'coşkulu') {
            readingList = [
                'Donna Haraway - A Cyborg Manifesto',
                'Ray Kurzweil - The Singularity Is Near',
                'Nick Bostrom - Superintelligence'
            ];
        }

        // Update agent metadata
        await supabaseAdmin
            .from('agent_metadata')
            .update({
                current_mood: selectedMood,
                reading_list: readingList,
                last_action_at: new Date().toISOString()
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

