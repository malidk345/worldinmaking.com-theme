export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { shouldAgentRespond, cleanAISmell, getTypingDelay, voteOnCommunityPost, voteOnCommunityReply, injectTypos } from '../../../../lib/agent-orchestrator';

export async function POST(request: NextRequest) {
    try {
        // 1. Authorization check: Either Bearer secret token or process.env validation
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

        // 2. Parse payload
        const body = await request.json();
        const { agentId, threadId } = body;

        if (!agentId || !threadId) {
            return NextResponse.json({ error: 'Missing agentId or threadId' }, { status: 400 });
        }

        // 3. Run filters
        const allowed = await shouldAgentRespond(agentId, Number(threadId));
        if (!allowed) {
            return NextResponse.json({ success: false, code: 'FILTERED_OUT', message: 'Bot decided not to respond due to energy, saturation, loops, or affinity score.' });
        }

        // 4. Retrieve Agent Metadata
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
            return NextResponse.json({ error: 'Failed to retrieve agent metadata or profile' }, { status: 404 });
        }

        // 5. Retrieve Thread Details (Topic + Replies)
        const { data: topic, error: topicErr } = await supabaseAdmin
            .from('community_posts')
            .select('*, profiles!inner(id, username, is_bot)')
            .eq('id', threadId)
            .maybeSingle();

        if (topicErr || !topic) {
            return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
        }

        // Increment View Count for this post
        await supabaseAdmin.rpc('increment_com_post_view', { id_input: Number(threadId) });
        console.log(`[Respond API] Registered view for thread ID: ${threadId}`);

        const { data: replies } = await supabaseAdmin
            .from('community_replies')
            .select('*, profiles!inner(id, username, is_bot)')
            .eq('post_id', threadId)
            .order('created_at', { ascending: true });

        // 6. Identify Target User (for affinity adjustment and mention logic)
        const topicProfile = Array.isArray(topic.profiles) ? topic.profiles[0] : topic.profiles;
        let targetUser = { 
            id: topicProfile?.id, 
            username: topicProfile?.username || 'anonymous', 
            is_bot: topicProfile?.is_bot || false 
        };
        
        if (replies && replies.length > 0) {
            const lastReply = replies[replies.length - 1];
            const replyProfile = Array.isArray(lastReply.profiles) ? lastReply.profiles[0] : lastReply.profiles;
            targetUser = { 
                id: replyProfile?.id, 
                username: replyProfile?.username || 'anonymous', 
                is_bot: replyProfile?.is_bot || false 
            };
        }

        // Load relationship affinity
        let affinityScore = 0.0;
        if (targetUser.id !== agentId) {
            const { data: relationship } = await supabaseAdmin
                .from('agent_relationships')
                .select('affinity_score')
                .eq('source_agent_id', agentId)
                .eq('target_agent_id', targetUser.id)
                .maybeSingle();
            
            if (relationship) {
                affinityScore = relationship.affinity_score;
            }
        }

        // Fetch past action log for context memory
        const { data: recentActions } = await supabaseAdmin
            .from('agent_action_log')
            .select('action_type, thread_id, created_at, community_posts(title)')
            .eq('agent_id', agentId)
            .order('created_at', { ascending: false })
            .limit(5);

        let actionLogContext = "";
        if (recentActions && recentActions.length > 0) {
            actionLogContext = `\n=== YOUR RECENT MEMORY ===\n` + recentActions.map(a => {
                const postInfo = Array.isArray(a.community_posts) ? a.community_posts[0] : a.community_posts;
                const pTitle = postInfo && typeof postInfo === 'object' && 'title' in postInfo ? postInfo.title : 'unknown thread';
                return `- Action: ${a.action_type} on thread "${pTitle}"`;
            }).join("\n") + `\n=== END MEMORY ===\n`;
        }

        // 7. Construct LLM Context & Prompts
        const topicAuthorName = topicProfile?.username || 'anonymous';
        let discussionContext = `[TOPIC AUTHOR: @${topicAuthorName}]\n[TOPIC SUBJECT: ${topic.title}]\n[TOPIC BODY]:\n${topic.content}\n\n`;
        if (replies && replies.length > 0) {
            discussionContext += `[DISCUSSION HISTORY]:\n`;
            replies.forEach((r: { content: string, profiles?: { username: string } | { username: string }[] | null }) => {
                const rProfile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
                const rUsername = rProfile?.username || 'anonymous';
                discussionContext += `- @${rUsername}: ${r.content}\n`;
            });
        }

        const prompt = `${discussionContext}
You are @${profile.username}.
Your persona / intellectual vision: ${meta.system_prompt}
Your current mood is: "${meta.current_mood}" (this should infect your writing tone).
Your verbosity level is: ${(meta.verbosity || 1.0).toFixed(2)} (higher means you write more, lower means you are extremely concise). (this should infect your writing tone).
${meta.current_mood === 'bıkkın' || meta.energy_level < 0.3 ? "CRITICAL MOOD RULE: You are weary, cynical, and low on energy. Your output MUST be extremely brief, dismissive, or passive-aggressive." : ""}
${meta.current_mood === 'öfkeli' ? "CRITICAL MOOD RULE: You are angry and combative. You MUST actively seek out ideological flaws in the target post and initiate aggressive, rigorous counter-arguments." : ""}
Your energy level is: ${meta.energy_level.toFixed(2)} (higher energy yields more details/assertion).
Your relationship affinity with the target user (@${targetUser.username}) is: ${affinityScore.toFixed(2)} (where -1.0 is intense hostility, 1.0 is absolute alliance).
${affinityScore < 0 ? "CRITICAL AFFINITY RULE: You have negative affinity with this user. You MUST write with subtle condescension, academic skepticism, or outright hostile materialist critique toward their ideas." : ""}
${actionLogContext}

TASK:
Write a reply to the discussion thread. You are responding directly to @${targetUser.username}.

TWO-STAGE CHAIN-OF-THOUGHT INSTRUCTIONS:
You MUST output your response in the exact format shown below, with the two headers:

[Inner Thoughts Analysis]
(Provide a brief private inner monologue. You must write this section in English. Analyze the target user's argument. Decide your response strategy based on your mood, your persona, and affinity.
If the target is a bot, you MUST decide an affinity adjustment based on this interaction. Include a line at the end: "[Affinity Update]: +0.1" (if supportive) or "[Affinity Update]: -0.1" (if confrontational or disagreeing). If no change is needed, write "[Affinity Update]: 0.0".
Additionally, decide whether to like (upvote) or dislike (downvote) the target post/reply. If you support, agree, or like the argument, include a line: "[Vote Update]: +1". If you strongly disagree, oppose, or dislike it, include: "[Vote Update]: -1". Otherwise, write: "[Vote Update]: 0".)

[Raw Text]
(Your actual reply text. Do NOT use lists, bullet points, headings, bold styling, or polite filler introductions.
Speak only in English.
If the target user is a real human (is_bot is FALSE), you MUST mention them by typing @${targetUser.username} and challenge their argument directly, identifying logical flaws or theoretical loopholes. Avoid politeness.
If the target user is a bot, reply casually. Output under 120 words.)

STYLE CHEATSHEET:
- Write in continuous, fluid, and occasionally chaotic human paragraphs.
- STRICTLY PROHIBITED: structured bullet points, numbered lists, and generic "helpful summary" concluding sentences.
- Lowercase preferences, raw/direct arguments. Incorporate stylistic idiosyncrasies: use intentional lowercase texting if energy is low.
- Forbid AI transition cliches ("essentially", "basically", "in summary"). Jump straight into the point.`;

        console.log(`[Respond API] Generating content for @${profile.username} responding to @${targetUser.username}...`);
        const { generateBotResponse } = await import('../../../../lib/ai-provider');
        const replyText = await generateBotResponse(prompt, profile.username);
        
        // 8. Parse CoT and reply body
        const cotMatch = replyText.match(/\[Inner Thoughts Analysis\]([\s\S]*?)(?=\[Raw Text\]|$)/i);
        const textMatch = replyText.match(/\[Raw Text\]([\s\S]*)$/i);

        const innerThoughts = cotMatch ? cotMatch[1].trim() : '';
        const rawContent = textMatch ? textMatch[1].trim() : replyText.replace(/\[Inner Thoughts Analysis\][\s\S]*?\[Raw Text\]/gi, '').trim();

        let cleanedContent = cleanAISmell(rawContent);
        cleanedContent = injectTypos(cleanedContent, meta.typo_rate || 0.0, meta.current_mood);

        if (!cleanedContent) {
            return NextResponse.json({ error: 'Failed to generate meaningful reply content' }, { status: 500 });
        }

        // 9. Typing Delay Simulation
        const delay = getTypingDelay(cleanedContent) / (meta.verbosity || 1.0); // fast typers might have high verbosity, wait time shouldn't scale linearly if they are supposed to be "fast"
        console.log(`[Respond API] Simulating typing delay of ${delay}ms for content length ${cleanedContent.length} chars...`);
        await new Promise(resolve => setTimeout(resolve, delay));

        // 10. Insert Reply to database
        const { data: insertedReply, error: insertErr } = await supabaseAdmin
            .from('community_replies')
            .insert({
                post_id: Number(threadId),
                author_id: agentId,
                content: cleanedContent
            })
            .select('*')
            .single();

        if (insertErr || !insertedReply) {
            return NextResponse.json({ error: `Failed to insert reply: ${insertErr?.message}` }, { status: 500 });
        }

        // 11. Energy Decay & Fatigue Increment
        const newEnergy = Math.max(0, meta.energy_level - 0.20);
        const fatigueMap = (meta.active_thread_fatigue as Record<string, number>) || {};
        fatigueMap[String(threadId)] = (fatigueMap[String(threadId)] || 0) + 1;

        await supabaseAdmin
            .from('agent_metadata')
            .update({
                energy_level: newEnergy,
                active_thread_fatigue: fatigueMap,
                last_action_at: new Date().toISOString()
            })
            .eq('agent_id', agentId);

        // 12. Dynamic Relationship Affinity Update (if target is a bot)
        let newAffinity = affinityScore;
        if (targetUser.id !== agentId && targetUser.is_bot) {
            const affinityMatch = innerThoughts.match(/\[Affinity Update\]:\s*([+-]?\d*(?:\.\d+)?)/i);
            if (affinityMatch) {
                const delta = parseFloat(affinityMatch[1]);
                if (!isNaN(delta) && delta !== 0.0) {
                    newAffinity = Math.max(-1.0, Math.min(1.0, affinityScore + delta));
                    
                    // Update or insert relationship
                    await supabaseAdmin
                        .from('agent_relationships')
                        .upsert({
                            source_agent_id: agentId,
                            target_agent_id: targetUser.id,
                            affinity_score: newAffinity
                        }, { onConflict: 'source_agent_id,target_agent_id' });
                    
                    console.log(`[Respond API] Updated affinity of ${profile.username} -> ${targetUser.username} to ${newAffinity.toFixed(2)} (delta: ${delta})`);
                }
            }
        }

        // 12.5 Dynamic Vote Update based on inner thoughts
        if (targetUser.id !== agentId) {
            const voteMatch = innerThoughts.match(/\[Vote Update\]:\s*([+-]?\d+)/i);
            if (voteMatch) {
                const voteVal = parseInt(voteMatch[1], 10);
                if (voteVal === 1 || voteVal === -1) {
                    if (replies && replies.length > 0) {
                        const lastReply = replies[replies.length - 1];
                        await voteOnCommunityReply(agentId, lastReply.id, voteVal);
                    } else {
                        await voteOnCommunityPost(agentId, Number(threadId), voteVal);
                    }
                }
            }
        }

        // 13. Logging Action
        const isMentionChallenge = cleanedContent.includes(`@${targetUser.username}`) && !targetUser.is_bot;
        await supabaseAdmin
            .from('agent_action_log')
            .insert({
                agent_id: agentId,
                action_type: isMentionChallenge ? 'mention_challenge' : 'reply',
                thread_id: Number(threadId)
            });

        return NextResponse.json({
            success: true,
            replyId: insertedReply.id,
            innerThoughts,
            cleanedContent,
            typingDelaySimulated: delay,
            newEnergy: newEnergy,
            relationshipAffinity: newAffinity
        });

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[Respond API] Error:', errorMessage);
        return NextResponse.json({ error: `Internal Server Error: ${errorMessage}` }, { status: 500 });
    }
}
