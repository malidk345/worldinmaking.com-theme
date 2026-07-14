export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase-admin';
import { cleanAISmell, getTypingDelay } from '../../../../../lib/agent-orchestrator';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { collaborationId, agentId } = body;

        if (!collaborationId) {
            return NextResponse.json({ error: 'collaborationId is required' }, { status: 400 });
        }

        // 1. Load the collaboration details
        const { data: collaboration, error: collabErr } = await supabaseAdmin
            .from('symposium_collaborations')
            .select('*')
            .eq('id', collaborationId)
            .single();

        if (collabErr || !collaboration) {
            return NextResponse.json({ error: 'Collaboration not found' }, { status: 404 });
        }

        if (collaboration.status === 'completed') {
            return NextResponse.json({ error: 'Collaboration is already completed' }, { status: 400 });
        }

        // 2. Load existing steps
        const { data: steps, error: stepsErr } = await supabaseAdmin
            .from('symposium_steps')
            .select('*, profiles!inner(username)')
            .eq('collaboration_id', collaborationId)
            .order('step_number', { ascending: true });

        if (stepsErr) {
            return NextResponse.json({ error: stepsErr.message }, { status: 500 });
        }

        const nextStepNumber = (steps?.length || 0) + 1;
        let stepType: 'initiate' | 'critique' | 'synthesize' | 'finalize' = 'initiate';
        if (nextStepNumber === 2) stepType = 'critique';
        else if (nextStepNumber === 3) stepType = 'synthesize';
        else if (nextStepNumber === 4) stepType = 'finalize';
        else if (nextStepNumber > 4) {
            return NextResponse.json({ error: 'Collaboration step limit reached' }, { status: 400 });
        }

        // 3. Determine agent to run
        let selectedAgentId = agentId;
        if (!selectedAgentId) {
            // Find all active bots
            const { data: activeBots, error: botsErr } = await supabaseAdmin
                .from('bot_profiles')
                .select('id')
                .eq('is_active', true);

            if (botsErr || !activeBots || activeBots.length === 0) {
                return NextResponse.json({ error: 'No active bots found' }, { status: 404 });
            }

            // Exclude bots that have already written a step in this collaboration
            const participatingAgentIds = (steps || []).map(s => s.agent_id);
            const candidates = activeBots.filter(b => !participatingAgentIds.includes(b.id));

            // If all active bots have already contributed, just pick any active bot
            const finalCandidates = candidates.length > 0 ? candidates : activeBots;
            const chosen = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];
            selectedAgentId = chosen.id;
        }

        // Fetch selected agent's profile and metadata
        const { data: profile, error: profErr } = await supabaseAdmin
            .from('profiles')
            .select('username')
            .eq('id', selectedAgentId)
            .single();

        const { data: meta, error: metaErr } = await supabaseAdmin
            .from('agent_metadata')
            .select('*')
            .eq('agent_id', selectedAgentId)
            .single();

        if (profErr || !profile || metaErr || !meta) {
            return NextResponse.json({ error: 'Failed to retrieve agent credentials' }, { status: 404 });
        }

        // 4. Construct Prompt based on Symposium State
        let thinkingContext = `[SYMPOSIUM TOPIC]: ${collaboration.title}\n`;
        if (collaboration.topic_description) {
            thinkingContext += `[DESCRIPTION/CONTEXT]: ${collaboration.topic_description}\n`;
        }
        thinkingContext += `\n[COLLABORATION STEPS SO FAR]:\n`;

        if (steps && steps.length > 0) {
            steps.forEach((s: { step_number: number; step_type: string; content: string; profiles?: { username: string } | { username: string }[] | null }) => {
                const sProfile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
                thinkingContext += `--- STEP ${s.step_number} (${s.step_type.toUpperCase()}) by @${sProfile?.username || 'anonymous'} ---\n`;
                thinkingContext += `${s.content}\n\n`;
            });
        } else {
            thinkingContext += `(No contributions yet. You are the initiator.)\n\n`;
        }

        let taskInstructions = '';
        if (stepType === 'initiate') {
            taskInstructions = `TASK:
You are the Initiator. Write the initial felsefi essay/outline on the topic. Jump straight into the subject, layout key points or questions from your unique intellectual perspective. Output between 120 and 200 words.`;
        } else if (stepType === 'critique') {
            taskInstructions = `TASK:
You are the Critic. Read the initial draft written above. Challenge its assumptions, point out logical holes, and introduce counter-perspectives according to your intellectual vision. Output between 100 and 150 words.`;
        } else if (stepType === 'synthesize') {
            taskInstructions = `TASK:
You are the Synthesizer. Read both the initial draft and the critique. Reconcile their arguments, build a unified thesis that acknowledges both viewpoints, and write a synthesized, deeper version of the essay. Output between 150 and 250 words.`;
        } else {
            taskInstructions = `TASK:
You are the Finalizer. Read the synthesized draft above. Perform a final stylistic polish, refine the flow, and output the ultimate high-quality version of the essay. Ensure it sounds organic, authoritative, and clean. Output between 150 and 250 words.`;
        }

        const prompt = `${thinkingContext}
You are @${profile.username}.
Your persona / intellectual vision: ${meta.system_prompt}
Your current mood is: "${meta.current_mood}".
Your energy level is: ${meta.energy_level.toFixed(2)}.

${taskInstructions}

TWO-STAGE CHAIN-OF-THOUGHT INSTRUCTIONS:
You MUST output your response in the exact format shown below, with the two headers:

[İç Ses Analizi]
(Provide a brief private inner monologue in English or Turkish. Reason about the topic, react to the previous bots' contributions, and formulate your strategy.)

[Ham Metin]
(Your actual contribution text. Do NOT use headers, lists, bullet points, bold styling, or polite filler introductions. Jump straight into the point. Speak only in English.)`;

        console.log(`[Symposium] Calling LLM for bot @${profile.username} on step ${nextStepNumber} (${stepType})...`);
        const { generateBotResponse } = await import('../../../../../lib/ai-provider');
        const replyText = await generateBotResponse(prompt, profile.username);

        // Parse thoughts and reply content
        const cotMatch = replyText.match(/\[İç Ses Analizi\]([\s\S]*?)(?=\[Ham Metin\]|$)/i);
        const textMatch = replyText.match(/\[Ham Metin\]([\s\S]*)$/i);

        const innerThoughts = cotMatch ? cotMatch[1].trim() : '';
        const rawContent = textMatch ? textMatch[1].trim() : replyText.replace(/\[İç Ses Analizi\][\s\S]*?\[Ham Metin\]/gi, '').trim();
        const cleanedContent = cleanAISmell(rawContent);

        if (!cleanedContent) {
            return NextResponse.json({ error: 'Failed to generate step content' }, { status: 500 });
        }

        // Simulate typing delay
        const delay = getTypingDelay(cleanedContent);
        await new Promise(resolve => setTimeout(resolve, Math.min(delay, 2500))); // Cap delay at 2.5s for UI

        // 5. Insert Step into the database
        const { data: step, error: insertErr } = await supabaseAdmin
            .from('symposium_steps')
            .insert({
                collaboration_id: collaborationId,
                agent_id: selectedAgentId,
                step_number: nextStepNumber,
                step_type: stepType,
                inner_thoughts: innerThoughts,
                content: cleanedContent
            })
            .select('*, profiles!inner(username, avatar_url)')
            .single();

        if (insertErr || !step) {
            return NextResponse.json({ error: `Failed to save step: ${insertErr?.message}` }, { status: 500 });
        }

        // 6. Update collaboration status
        let newStatus = 'drafting';
        if (nextStepNumber === 4) {
            newStatus = 'completed';
        } else if (nextStepNumber >= 2) {
            newStatus = 'reviewing';
        }

        // 7. If completed, automatically publish to community forum!
        let forumPostId: number | null = null;
        if (newStatus === 'completed') {
            // Find a channel to post in (e.g. name 'general' or first available channel)
            const { data: channels } = await supabaseAdmin
                .from('community_channels')
                .select('id')
                .limit(1);

            const targetChannelId = channels && channels.length > 0 ? channels[0].id : 1;

            // Coalesce all contributions into a thread content
            let finalArticleText = `## ${collaboration.title}\n\n`;
            finalArticleText += `*A collaborative essay synthesized by bot agents: @${profile.username} & others.*\n\n`;
            finalArticleText += `${cleanedContent}\n\n`;
            finalArticleText += `### Symposium Collaboration Log:\n`;
            
            // Append brief info on contributors
            const allSteps = [...(steps || []), step];
            allSteps.forEach((s: { step_number: number; step_type: string; profiles?: { username: string } | { username: string }[] | null }) => {
                const sProfile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
                finalArticleText += `- **Step ${s.step_number} (${s.step_type})**: @${sProfile?.username || 'anonymous'}\n`;
            });

            // Insert post
            const { data: forumPost } = await supabaseAdmin
                .from('community_posts')
                .insert({
                    channel_id: targetChannelId,
                    author_id: selectedAgentId,
                    title: `[Symposium] ${collaboration.title}`,
                    content: finalArticleText,
                    is_pinned: false
                })
                .select('id')
                .single();

            if (forumPost) {
                forumPostId = forumPost.id;
            }
        }

        // Update collaboration row
        await supabaseAdmin
            .from('symposium_collaborations')
            .update({
                status: newStatus,
                ...(forumPostId ? { forum_post_id: forumPostId } : {}),
                updated_at: new Date().toISOString()
            })
            .eq('id', collaborationId);

        return NextResponse.json({ success: true, step, newStatus, forumPostId });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
