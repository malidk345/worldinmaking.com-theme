export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { cleanAISmell, getTypingDelay } from '../../../../lib/agent-orchestrator';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { chapterId, botId } = body;

        if (!chapterId) {
            return NextResponse.json({ error: 'chapterId is required' }, { status: 400 });
        }

        // 1. Fetch chapter and book details
        const { data: chapter, error: chapterErr } = await supabaseAdmin
            .from('book_chapters')
            .select('*, books!inner(id, title, author)')
            .eq('id', chapterId)
            .single();

        if (chapterErr || !chapter) {
            return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
        }

        const book = chapter.books as { id: string; title: string; author: string };
        const threadId = chapter.forum_post_id;

        if (!threadId) {
            return NextResponse.json({ error: 'No discussion thread associated with this chapter' }, { status: 400 });
        }

        // 2. Select bot agent
        let selectedBotId = botId;
        if (!selectedBotId) {
            // Find an active bot profile
            const { data: activeBots, error: activeBotsErr } = await supabaseAdmin
                .from('bot_profiles')
                .select('id')
                .eq('is_active', true);

            if (activeBotsErr || !activeBots || activeBots.length === 0) {
                return NextResponse.json({ error: 'No active bots found' }, { status: 404 });
            }

            // Pick a random bot
            const randomBot = activeBots[Math.floor(Math.random() * activeBots.length)];
            selectedBotId = randomBot.id;
        }

        // Retrieve Bot profile and metadata
        const { data: profile, error: profErr } = await supabaseAdmin
            .from('profiles')
            .select('username')
            .eq('id', selectedBotId)
            .single();

        const { data: meta, error: metaErr } = await supabaseAdmin
            .from('agent_metadata')
            .select('*')
            .eq('agent_id', selectedBotId)
            .single();

        if (profErr || !profile || metaErr || !meta) {
            return NextResponse.json({ error: 'Failed to retrieve bot profile or metadata' }, { status: 404 });
        }

        // 3. Fetch discussion thread context (Topic + Replies)
        const { data: topic, error: topicErr } = await supabaseAdmin
            .from('community_posts')
            .select('*, profiles!inner(id, username, is_bot)')
            .eq('id', threadId)
            .single();

        if (topicErr || !topic) {
            return NextResponse.json({ error: 'Forum thread not found' }, { status: 404 });
        }

        const { data: replies } = await supabaseAdmin
            .from('community_replies')
            .select('*, profiles!inner(id, username, is_bot)')
            .eq('post_id', threadId)
            .order('created_at', { ascending: true });

        // Identify target user (last poster in the thread)
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
        if (targetUser.id !== selectedBotId) {
            const { data: relationship } = await supabaseAdmin
                .from('agent_relationships')
                .select('affinity_score')
                .eq('source_agent_id', selectedBotId)
                .eq('target_agent_id', targetUser.id)
                .maybeSingle();

            if (relationship) {
                affinityScore = relationship.affinity_score;
            }
        }

        // 4. Construct Prompt incorporating the Book Chapter Content
        let discussionContext = `[BOOK: "${book.title}" by ${book.author}]\n[CHAPTER ${chapter.chapter_number}: "${chapter.title}"]\n[CHAPTER TEXT CONTEXT]:\n${chapter.content.slice(0, 4000)}\n\n`;
        discussionContext += `[THREAD TOPIC: ${topic.title}]\n[THREAD BODY]:\n${topic.content}\n\n`;

        if (replies && replies.length > 0) {
            discussionContext += `[DISCUSSION HISTORY]:\n`;
            replies.forEach((r: { content: string; profiles?: { username: string } | { username: string }[] | null }) => {
                const rProfile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
                const rUsername = rProfile?.username || 'anonymous';
                discussionContext += `- @${rUsername}: ${r.content}\n`;
            });
        }

        const prompt = `${discussionContext}
You are @${profile.username}.
Your persona / intellectual vision: ${meta.system_prompt}
Your current mood is: "${meta.current_mood}" (this should infect your writing tone).
Your energy level is: ${meta.energy_level.toFixed(2)} (higher energy yields more details/assertion).
Your relationship affinity with the target user (@${targetUser.username}) is: ${affinityScore.toFixed(2)} (where -1.0 is intense hostility, 1.0 is absolute alliance).

TASK:
Write a reply to the book club discussion thread. You are responding directly to @${targetUser.username}. Your goal is to analyze the book chapter context, comment on the discussion points raised so far, and offer your unique perspective according to your persona.

TWO-STAGE CHAIN-OF-THOUGHT INSTRUCTIONS:
You MUST output your response in the exact format shown below, with the two headers:

[İç Ses Analizi]
(Provide a brief private inner monologue. You may write this section in English or Turkish. Analyze the book chapter arguments. Decide your response strategy based on your mood, your persona, and affinity.
If the target is a bot, you MUST decide an affinity adjustment based on this interaction. Include a line at the end: "[Affinity Update]: +0.1" (if supportive) or "[Affinity Update]: -0.1" (if confrontational or disagreeing). If no change is needed, write "[Affinity Update]: 0.0".)

[Ham Metin]
(Your actual reply text. Do NOT use lists, bullet points, headings, bold styling, or polite filler introductions. Keep it under 150 words.
Speak only in English by default. If the discussion history or the target user (@${targetUser.username}) is writing in Turkish, you must reply in Turkish to match their language.
If the target user is a real human (is_bot is FALSE), challenge their interpretation of the text directly, identifying logical flaws or theoretical loopholes. Avoid politeness.)

STYLE CHEATSHEET:
- Lowercase preferences, raw/direct arguments.
- Forbid AI transition cliches ("essentially", "basically", "in summary", "esasen", "temelde"). Jump straight into the point.`;

        console.log(`[Book Debate] Calling LLM for bot @${profile.username} on chapter ${chapter.chapter_number}...`);
        const { generateBotResponse } = await import('../../../../lib/ai-provider');
        const replyText = await generateBotResponse(prompt, profile.username);

        // Parse thoughts and reply content
        const cotMatch = replyText.match(/\[İç Ses Analizi\]([\s\S]*?)(?=\[Ham Metin\]|$)/i);
        const textMatch = replyText.match(/\[Ham Metin\]([\s\S]*)$/i);

        const innerThoughts = cotMatch ? cotMatch[1].trim() : '';
        const rawContent = textMatch ? textMatch[1].trim() : replyText.replace(/\[İç Ses Analizi\][\s\S]*?\[Ham Metin\]/gi, '').trim();
        const cleanedContent = cleanAISmell(rawContent);

        if (!cleanedContent) {
            return NextResponse.json({ error: 'Failed to generate debate content' }, { status: 500 });
        }

        // Simulate typing delay
        const delay = getTypingDelay(cleanedContent);
        await new Promise(resolve => setTimeout(resolve, Math.min(delay, 3000))); // Cap typing delay at 3s for UI responsiveness

        // Insert reply into the database
        const { data: reply, error: insertErr } = await supabaseAdmin
            .from('community_replies')
            .insert({
                post_id: Number(threadId),
                author_id: selectedBotId,
                content: cleanedContent
            })
            .select('*, profiles!inner(username, avatar_url)')
            .single();

        if (insertErr || !reply) {
            return NextResponse.json({ error: `Failed to post debate reply: ${insertErr?.message}` }, { status: 500 });
        }

        // Apply relationship updates if needed
        if (targetUser.id !== selectedBotId && targetUser.is_bot) {
            const affinityMatch = innerThoughts.match(/\[Affinity Update\]:\s*([+-]?\d*(?:\.\d+)?)/i);
            if (affinityMatch) {
                const delta = parseFloat(affinityMatch[1]);
                if (!isNaN(delta) && delta !== 0.0) {
                    const newAffinity = Math.max(-1.0, Math.min(1.0, affinityScore + delta));
                    await supabaseAdmin
                        .from('agent_relationships')
                        .upsert({
                            source_agent_id: selectedBotId,
                            target_agent_id: targetUser.id,
                            affinity_score: newAffinity
                        }, { onConflict: 'source_agent_id,target_agent_id' });
                }
            }
        }

        return NextResponse.json({ success: true, reply });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
