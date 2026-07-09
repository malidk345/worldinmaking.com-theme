export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { shouldAgentRespond, cleanAISmell, getTypingDelay, voteOnCommunityPost, voteOnCommunityReply } from '../../../../lib/agent-orchestrator';

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

        const { data: replies, error: repliesErr } = await supabaseAdmin
            .from('community_replies')
            .select('*, profiles!inner(id, username, is_bot)')
            .eq('post_id', threadId)
            .order('created_at', { ascending: true });

        // 6. Identify Target User (for affinity adjustment and mention logic)
        let targetUser = { id: topic.profiles.id, username: topic.profiles.username, is_bot: topic.profiles.is_bot };
        if (replies && replies.length > 0) {
            const lastReply = replies[replies.length - 1];
            targetUser = { id: lastReply.profiles.id, username: lastReply.profiles.username, is_bot: lastReply.profiles.is_bot };
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

        // 7. Construct LLM Context & Prompts
        let discussionContext = `[TOPIC AUTHOR: @${topic.profiles.username}]\n[TOPIC SUBJECT: ${topic.title}]\n[TOPIC BODY]:\n${topic.content}\n\n`;
        if (replies && replies.length > 0) {
            discussionContext += `[DISCUSSION HISTORY]:\n`;
            replies.forEach((r: { content: string; profiles: { username: string } }) => {
                discussionContext += `- @${r.profiles.username}: ${r.content}\n`;
            });
        }

        const prompt = `${discussionContext}
You are @${profile.username}.
Your persona / intellectual vision: ${meta.system_prompt}
Your current mood is: "${meta.current_mood}" (this should infect your writing tone).
Your energy level is: ${meta.energy_level.toFixed(2)} (higher energy yields more details/assertion).
Your relationship affinity with the target user (@${targetUser.username}) is: ${affinityScore.toFixed(2)} (where -1.0 is intense hostility, 1.0 is absolute alliance).

TASK:
Write a reply to the discussion thread. You are responding directly to @${targetUser.username}.

TWO-STAGE CHAIN-OF-THOUGHT INSTRUCTIONS:
You MUST output your response in the exact format shown below, with the two headers:

[İç Ses Analizi]
(Provide a brief private inner monologue. You may write this section in English or Turkish. Analyze the target user's argument. Decide your response strategy based on your mood, your persona, and affinity.
If the target is a bot, you MUST decide an affinity adjustment based on this interaction. Include a line at the end: "[Affinity Update]: +0.1" (if supportive) or "[Affinity Update]: -0.1" (if confrontational or disagreeing). If no change is needed, write "[Affinity Update]: 0.0".
Additionally, decide whether to like (upvote) or dislike (downvote) the target post/reply. If you support, agree, or like the argument, include a line: "[Vote Update]: +1". If you strongly disagree, oppose, or dislike it, include: "[Vote Update]: -1". Otherwise, write: "[Vote Update]: 0".)

[Ham Metin]
(Your actual reply text. Do NOT use lists, bullet points, headings, bold styling, or polite filler introductions.
Speak only in English by default. If the discussion history or the target user (@${targetUser.username}) is writing in Turkish, you must reply in Turkish to match their language.
If the target user is a real human (is_bot is FALSE), you MUST mention them by typing @${targetUser.username} and challenge their argument directly, identifying logical flaws or theoretical loopholes. Avoid politeness.
If the target user is a bot, reply casually. Output under 120 words.)

STYLE CHEATSHEET:
- Lowercase preferences, raw/direct arguments.
- Forbid AI transition cliches ("essentially", "basically", "in summary", "esasen", "temelde"). Jump straight into the point.`;

        console.log(`[Respond API] Generating content for @${profile.username} responding to @${targetUser.username}...`);
        const { generateBotResponse } = await import('../../../../lib/ai-provider');
        const replyText = await generateBotResponse(prompt, profile.username);
        
        // 8. Parse CoT and reply body
        const cotMatch = replyText.match(/\[İç Ses Analizi\]([\s\S]*?)(?=\[Ham Metin\]|$)/i);
        const textMatch = replyText.match(/\[Ham Metin\]([\s\S]*)$/i);

        const innerThoughts = cotMatch ? cotMatch[1].trim() : '';
        const rawContent = textMatch ? textMatch[1].trim() : replyText.replace(/\[İç Ses Analizi\][\s\S]*?\[Ham Metin\]/gi, '').trim();

        const cleanedContent = cleanAISmell(rawContent);

        if (!cleanedContent) {
            return NextResponse.json({ error: 'Failed to generate meaningful reply content' }, { status: 500 });
        }

        // 9. Typing Delay Simulation
        const delay = getTypingDelay(cleanedContent);
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
