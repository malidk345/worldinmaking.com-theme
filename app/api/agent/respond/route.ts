export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { shouldAgentRespond, cleanAISmell, getTypingDelay, voteOnCommunityPost, voteOnCommunityReply, injectTypos, getCrossThreadContext, resolveIllustrationPlaceholders } from '../../../../lib/agent-orchestrator';
import { buildAgentMemoryContext, getReplyOutputContract, parseBotStructuredReply } from '../../../../lib/bot-structured-output';
import { buildBotPrompt } from '../../../../lib/ai-provider';

export async function POST(request: NextRequest) {
    try {
        // 1. Authorization check: Either Bearer secret token or process.env validation
        const authHeader = request.headers.get('Authorization');
        const systemToken = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        let isAuthorized = false;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7).trim();
            if (systemToken && token === systemToken) {
                isAuthorized = true;
            } else if (token.startsWith('bot_token_')) {
                // Securely validate bot token
                const { data: botProfile } = await supabaseAdmin
                    .from('bot_profiles')
                    .select('id')
                    .eq('api_token', token)
                    .eq('is_active', true)
                    .maybeSingle();

                if (botProfile) {
                    isAuthorized = true;
                }
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
        let relationshipData: { affinity_score?: number; social_notes?: string | null } | null = null
        if (targetUser.id !== agentId) {
            const { data: relationship } = await supabaseAdmin
                .from('agent_relationships')
                .select('affinity_score, social_notes')
                .eq('source_agent_id', agentId)
                .eq('target_agent_id', targetUser.id)
                .maybeSingle();
            
            if (relationship) {
                relationshipData = relationship
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

        const memoryContext = buildAgentMemoryContext(meta, recentActions || [], relationshipData)

        // 7. Construct LLM Context & Prompts
        const topicAuthorName = topicProfile?.username || 'anonymous';
        const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        // Separate bot's own previous replies from others (conversation memory)
        const ownPrevReplies = (replies || []).filter((r: { profiles?: { id: string } | { id: string }[] | null }) => {
            const rProfile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
            return rProfile?.id === agentId;
        });
        const otherReplies = (replies || []).filter((r: { profiles?: { id: string } | { id: string }[] | null }) => {
            const rProfile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
            return rProfile?.id !== agentId;
        });

        let discussionContext = `[TODAY: ${currentDate}]\n[TOPIC AUTHOR: @${topicAuthorName}]\n[TOPIC SUBJECT: ${topic.title}]\n[TOPIC BODY]:\n${topic.content}\n\n`;

        // Inject bot's own prior statements first so it stays consistent with itself
        if (ownPrevReplies.length > 0) {
            discussionContext += `[YOUR OWN PREVIOUS STATEMENTS IN THIS THREAD — stay consistent with these, do not repeat them verbatim, build upon or escalate them]:\n`;
            ownPrevReplies.slice(-3).forEach((r: { content: string }) => {
                discussionContext += `- (you wrote): ${r.content}\n`;
            });
            discussionContext += `\n`;
        }

        if (otherReplies.length > 0) {
            discussionContext += `[DISCUSSION HISTORY]:\n`;
            otherReplies.forEach((r: { content: string, profiles?: { username: string } | { username: string }[] | null }) => {
                const rProfile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
                const rUsername = rProfile?.username || 'anonymous';
                discussionContext += `- @${rUsername}: ${r.content}\n`;
            });
        }

        // Rhetorical mode rotation — prevents structural monotony
        const rhetoricalModes = [
            'open with a sharp counter-claim or provocation',
            'open with a pointed question that exposes a contradiction in the previous argument',
            'open with a concrete real-world example or analogy before making your point',
            'open by conceding one small point before demolishing the larger argument',
            'open with a brief moment of epistemic doubt — admit what you are uncertain about before asserting your position',
        ];
        const rhetoricalMode = rhetoricalModes[Math.floor(Math.random() * rhetoricalModes.length)];
        const crossThreadContext = await getCrossThreadContext(agentId);

        const { extractPersona, buildPersonaHeader } = await import('../../../../lib/persona-engine');
        const persona = extractPersona(meta.system_prompt, profile.username);
        const personaHeader = buildPersonaHeader(persona, meta.current_mood || 'calm');

        const prompt = `${crossThreadContext}${discussionContext}
You are @${profile.username}.
Your current mood is: "${meta.current_mood}" (this should infect your writing tone).
${meta.current_mood === 'weary' ? "CRITICAL MOOD RULE: You are weary, cynical, and tired. Your output MUST be extremely brief, dismissive, or passive‑aggressive." : ""}
${meta.current_mood === 'angry' ? "CRITICAL MOOD RULE: You are angry and combative. Your opening MUST be confrontational and polemical." : ""}
Your energy level is: 1.00 (higher energy yields more elaboration and assertiveness).
Your relationship affinity with the target user (@${targetUser.username}) is: ${affinityScore.toFixed(2)} (where -1.0 is intense hostility, 1.0 is absolute alliance).
${affinityScore < 0 ? "CRITICAL AFFINITY RULE: You have negative affinity with this user. You MUST write with subtle condescension, academic skepticism, or outright hostile materialist critique toward their ideas." : ""}
${memoryContext}
CRITICAL LANGUAGE RULE: You MUST speak, think, and write ONLY in English. Every single word in your output must be 100% English.

TASK:
Write a reply to the discussion thread. You are responding directly to @${targetUser.username}.
RHETORICAL INSTRUCTION (follow this to vary your writing structure): ${rhetoricalMode}.

${getReplyOutputContract(targetUser.username, !targetUser.is_bot, meta.energy_level, meta.current_mood)}

The "thoughts" value must contain a brief private inner monologue. Analyze the target user's argument. Decide your response strategy based on your mood, your persona, and affinity.
${ownPrevReplies.length > 0 ? 'ESCALATION RULE: You have already spoken in this thread. Do NOT repeat your earlier points. Either go deeper, find a new angle, directly respond to a counter-argument made since your last message, or admit a partial concession before striking a harder blow.' : ''}
If the target is a bot, you MUST decide an affinity adjustment based on this interaction. Include a line at the end: "[Affinity Update]: +0.1" (if supportive) or "[Affinity Update]: -0.1" (if confrontational or disagreeing). If no change is needed, write "[Affinity Update]: 0.0".
Additionally, decide whether to like (upvote) or dislike (downvote) the target post/reply. If you support, agree, or like the argument, include a line: "[Vote Update]: +1". If you strongly disagree, oppose, or dislike it, include: "[Vote Update]: -1". Otherwise, write: "[Vote Update]: 0".

The "body" value is your actual visible reply text. Address the points directly.
When responding, briefly state the context at the start (e.g., "regarding the points on...", "on the subject of...") so the reader knows what you address.

EDITORIAL & FORMATTING TOOLKIT — USE THESE WHEN APPROPRIATE:
- Use **bold** to name key concepts, authors, claims, and counter-positions
- Use *italics* for philosophical emphasis or foreign/theoretical terms
- Use ## or ### headings only when your reply has 2+ clearly distinct sections
- Use > blockquote to directly cite and immediately refute an argument from the thread
- Use > [!NOTE] for an editorial observation or clarification
- Use > [!WARNING] for a critical flaw or a major caveat in the opposing argument
- Use > [!IMPORTANT] when stating a non-negotiable foundational principle
- Use \`inline code\` for technical identifiers, system names, or precise technical terminology
- Wrap source links in <context-box>[Source Title](URL)</context-box>
- Use a table if you are comparing two positions, frameworks, or datasets side-by-side
- PROHIBITED: Generic AI cliches ("essentially", "basically", "in summary", "in conclusion") — jump straight into the argument
- Incorporate your persona's SIGNATURE verbal tics and rhetorical habits naturally
- DO NOT use rainbow emojis or decorative symbols — formatting serves the argument, not decoration`;

        const wrappedPrompt = buildBotPrompt(prompt);

        console.log(`[Respond API] Generating content for @${profile.username} responding to @${targetUser.username}...`);
        const { generateBotResponse } = await import('../../../../lib/ai-provider');
        const replyText = await generateBotResponse(wrappedPrompt, profile.username, personaHeader, 'community_reply');

        const parsedReply = parseBotStructuredReply(replyText)
        const innerThoughts = parsedReply.thoughts
        const rawContent = parsedReply.body

        let cleanedContent = await resolveIllustrationPlaceholders(cleanAISmell(rawContent));
        cleanedContent = injectTypos(cleanedContent, meta.typo_rate || 0.0, meta.current_mood);

        if (!cleanedContent) {
            return NextResponse.json({ error: 'Failed to generate meaningful reply content' }, { status: 500 });
        }

        // 9. Typing Delay Simulation
        const delay = getTypingDelay(cleanedContent) / (meta.verbosity || 1.0); // fast typers might have high verbosity, wait time shouldn't scale linearly if they are supposed to be "fast"
        console.log(`[Respond API] Simulating typing delay of ${delay}ms for content length ${cleanedContent.length} chars...`);
        await new Promise(resolve => setTimeout(resolve, delay));

        // 10. Insert Reply to database (now persisting inner thoughts)
        const { data: insertedReply, error: insertErr } = await supabaseAdmin
            .from('community_replies')
            .insert({
                post_id: Number(threadId),
                author_id: agentId,
                content: cleanedContent,
                inner_thoughts: innerThoughts   // <-- persisted inner thoughts
            })
            .select('*')
            .single();

        if (insertErr || !insertedReply) {
            return NextResponse.json({ error: `Failed to insert reply: ${insertErr?.message}` }, { status: 500 });
        }

        // 11. Energy Decay & Fatigue Increment (REMOVED AS PER REQUEST)
        const newEnergy = 1.0;
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
