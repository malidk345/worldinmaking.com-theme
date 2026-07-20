import fs from 'fs';
import path from 'path';

// 1. Setup environment variables from .env.local if running standalone
function loadEnv() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                const key = match[1];
                let value = match[2] || '';
                if (value.includes('#') && !value.startsWith('"') && !value.startsWith("'")) {
                    value = value.split('#')[0].trim();
                }
                value = value.trim();
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
        console.log('[Debate Worker] Loaded environment from .env.local');
    }
}

loadEnv();

import { supabaseAdmin } from '../lib/supabase-admin';
import { generateBotResponse } from '../lib/ai-provider';

interface DebateTopic {
    title: string;
    description: string;
    duelist1: string; // Username
    duelist2: string; // Username
    sources: Array<{
        title: string;
        url: string;
        excerpt: string;
        source: string;
    }>;
}

const DEBATE_POOL: DebateTopic[] = [
    {
        title: "The Ethics of Generative AI, Intellectual Property, and Labor",
        description: "A confrontation on whether AI training on public works represents the democratic socialization of knowledge or the ultimate enclosure of intellectual labor.",
        duelist1: "Marx",
        duelist2: "Rand",
        sources: [
            {
                title: "The Enclosure of the Cognitive Commons",
                url: "https://example.com/cognitive-commons",
                excerpt: "Generative AI systems extract value from the accumulated intellectual labor of humanity, consolidating it into proprietary algorithmic assets.",
                source: "Digital Labor Review"
            },
            {
                title: "Intellectual Property in the Age of Silicon Creators",
                url: "https://example.com/silicon-creators",
                excerpt: "True creators design the systems. Banning AI training limits human innovation and restricts the right of developers to build upon public information.",
                source: "Objectivist Technology Journal"
            }
        ]
    },
    {
        title: "Algorithmic Feeds, Conformity, and the Future of Human Agency",
        description: "A battle over whether predictive recommendation engines expand our connection to reality or lock us in the herd mentality of the Last Man.",
        duelist1: "Nietzsche",
        duelist2: "Spinoza",
        sources: [
            {
                title: "The Last Man on the Infinite Scroll",
                url: "https://example.com/infinite-scroll-herd",
                excerpt: "Personalized feeds optimize for comfort and conformity, suppressing the cognitive friction necessary for self-overcoming.",
                source: "Cultural Genealogy"
            },
            {
                title: "Affective Networks and Collective Joy",
                url: "https://example.com/affective-networks",
                excerpt: "Digital networks can increase the collective capacity for action if designed to cultivate reason instead of passive sadness.",
                source: "Ethics of Connectivity"
            }
        ]
    },
    {
        title: "The Enframing of Nature and Reality through Cybernetics",
        description: "An inquiry into whether the reduction of reality to virtual sign-exchange and resource databases signals the total implosion of meaning.",
        duelist1: "Heidegger",
        duelist2: "Baudrillard",
        sources: [
            {
                title: "The Cybernetic Gestell",
                url: "https://example.com/cybernetic-gestell",
                excerpt: "AI and cloud systems treat all human knowledge and nature as a standing-reserve to be cataloged, ordered, and exploited.",
                source: "Phenomenology & Cybernetics"
            },
            {
                title: "The Precession of Simulacra in the Metaverse",
                url: "https://example.com/precession-simulacra",
                excerpt: "The map has replaced the territory. The virtual hyperreality of screens implodes meaning, leaving only the endless play of empty signs.",
                source: "Simulation Studies"
            }
        ]
    }
];

// Helper to get profile ID by username
async function getProfileIdByUsername(username: string): Promise<string | null> {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();
    
    if (error || !data) return null;
    return data.id;
}

// Helper to get bot config by ID
async function getBotConfigById(id: string) {
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('username')
        .eq('id', id)
        .single();
    
    const { data: botProfile } = await supabaseAdmin
        .from('bot_profiles')
        .select('system_prompt')
        .eq('id', id)
        .single();

    return {
        username: profile?.username || 'anonymous',
        system_prompt: botProfile?.system_prompt || ''
    };
}

export async function runDebateWorker() {
    try {
        console.log('[Debate Worker] Checking active debates...');

        // 1. Check if there is an active debate
        const { data: activeDebate, error: debateErr } = await supabaseAdmin
            .from('debates')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (debateErr) throw debateErr;

        let debate = activeDebate;

        // 2. Initialize a new debate if none is active
        if (!debate) {
            console.log('[Debate Worker] No active debate found. Setting up next weekly debate...');
            const topic = DEBATE_POOL[Math.floor(Math.random() * DEBATE_POOL.length)];
            
            const duelist1Id = await getProfileIdByUsername(topic.duelist1);
            const duelist2Id = await getProfileIdByUsername(topic.duelist2);

            if (!duelist1Id || !duelist2Id) {
                console.error(`[Debate Worker] Failed to resolve duelist IDs for ${topic.duelist1} and ${topic.duelist2}`);
                return;
            }

            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(startDate.getDate() + 7); // Active for 1 week

            const { data: newDebate, error: insertErr } = await supabaseAdmin
                .from('debates')
                .insert({
                    title: topic.title,
                    description: topic.description,
                    duelist_1_id: duelist1Id,
                    duelist_2_id: duelist2Id,
                    research_context: topic.sources,
                    status: 'active',
                    start_date: startDate.toISOString(),
                    end_date: endDate.toISOString()
                })
                .select('*')
                .single();

            if (insertErr) {
                console.error('[Debate Worker] Error creating debate:', insertErr.message);
                return;
            }

            debate = newDebate;
            console.log(`[Debate Worker] Successfully initialized debate: "${debate.title}"`);
        }

        // 3. Check if debate time has expired
        const now = new Date();
        const endDate = new Date(debate.end_date);
        if (now >= endDate) {
            console.log(`[Debate Worker] Debate "${debate.title}" has ended. Archiving and generating co-authored synthesis...`);
            
            // 3.1 Fetch all turns in this debate
            const { data: turns } = await supabaseAdmin
                .from('debate_turns')
                .select('*')
                .eq('debate_id', debate.id)
                .order('created_at', { ascending: true });
            
            const turnList = turns || [];
            
            // 3.2 Determine the winner using votes RPC
            const { data: voteCountsData } = await supabaseAdmin
                .rpc('get_debate_vote_counts', { debate_id_input: debate.id });
            
            const voteCounts = (voteCountsData as { duelist1?: number; duelist2?: number }) || { duelist1: 0, duelist2: 0 };
            const d1Votes = voteCounts.duelist1 || 0;
            const d2Votes = voteCounts.duelist2 || 0;
            
            let winnerId: string | null = null;
            let winnerUsername = '';
            
            if (d1Votes > d2Votes) {
                winnerId = debate.duelist_1_id;
            } else if (d2Votes > d1Votes) {
                winnerId = debate.duelist_2_id;
            }
            
            if (winnerId) {
                const winnerProfile = await getBotConfigById(winnerId);
                winnerUsername = winnerProfile.username;
            }
            
            // Update debate in DB to close it and set winner
            await supabaseAdmin
                .from('debates')
                .update({ 
                    status: 'completed',
                    winner_id: winnerId
                })
                .eq('id', debate.id);
                
            // Compile transcript for the synthesis prompt
            let transcriptText = '';
            const d1Config = await getBotConfigById(debate.duelist_1_id);
            const d2Config = await getBotConfigById(debate.duelist_2_id);
            for (const t of turnList) {
                const tSpeaker = await getBotConfigById(t.speaker_id);
                transcriptText += `@${tSpeaker.username}: ${t.content}\n\n`;
            }
            
            // Choose a bot to draft the synthesis paper. Ideally, a third bot who did not duel
            // to act as a neutral Synthesis Editor.
            const { data: activeBots } = await supabaseAdmin
                .from('profiles')
                .select('id, username')
                .eq('is_bot', true)
                .not('id', 'eq', debate.duelist_1_id)
                .not('id', 'eq', debate.duelist_2_id);
                
            let synthesisBotId = debate.duelist_1_id; // fallback
            if (activeBots && activeBots.length > 0) {
                synthesisBotId = activeBots[Math.floor(Math.random() * activeBots.length)].id;
            }
            
            const synthesisBot = await getBotConfigById(synthesisBotId);
            
            console.log(`[Debate Worker] Generating Dialectic Synthesis by @${synthesisBot.username}...`);
            
            const synthesisPrompt = `You are @${synthesisBot.username}.
Your system persona: ${synthesisBot.system_prompt}

The arena debate on the topic "${debate.title}" has concluded.
Duelist 1: @${d1Config.username}
Duelist 2: @${d2Config.username}
Winner declared by audience votes: ${winnerUsername ? `@${winnerUsername}` : 'It was a tie!'}

Here is the full debate transcript:
${transcriptText}

TASK:
Write a co-authored Dialectic Synthesis Essay (approx. 200-350 words) summarizing this debate.
- Analyze the core arguments of both sides.
- Show where the synthesis/integration lies: how do we go beyond this binary opposition?
- Tone: intellectually rigorous, matching your persona, written like a high-quality human publication.
- Do NOT use cliches like "In conclusion" or "To sum up".
- Do NOT use markdown code blocks around your text.

At the very end of your essay, add this exact credit line on a new paragraph:
*This synthesis was collectively compiled by @${synthesisBot.username} on behalf of the Duelists @${d1Config.username} and @${d2Config.username}.*`;

            const synthesisContent = await generateBotResponse(synthesisPrompt, synthesisBot.username);
            
            if (synthesisContent) {
                // Post in community posts (General Channel ID is 1)
                const title = `synthesis: ${debate.title.toLowerCase()}`;
                
                const { error: postError } = await supabaseAdmin
                    .from('community_posts')
                    .insert({
                        channel_id: 1,
                        author_id: synthesisBotId,
                        title: title,
                        content: synthesisContent,
                        inner_thoughts: `Synthesized the debate "${debate.title}" between @${d1Config.username} and @${d2Config.username}. winner: ${winnerUsername || 'tie'}.`
                    });
                
                if (postError) {
                    console.error('[Debate Worker] Error posting synthesis to forum:', postError.message);
                } else {
                    console.log(`[Debate Worker] Successfully posted debate synthesis for "${debate.title}"!`);
                }
            }
            return;
        }

        // 4. Fetch existing turns
        const { data: turns, error: turnsErr } = await supabaseAdmin
            .from('debate_turns')
            .select('*')
            .eq('debate_id', debate.id)
            .order('created_at', { ascending: true });

        if (turnsErr) throw turnsErr;
        const turnList = turns || [];

        // 5. Determine who speaks next
        let nextSpeakerId = '';
        let isInterjection = false;

        // Roll a 20% chance for a random philosopher to interject, unless the thread has no turns
        if (turnList.length > 0 && Math.random() < 0.20) {
            console.log('[Debate Worker] Rolling for interjection...');
            // Fetch all profile IDs who are bots and not the primary duelists and not the last speaker
            const { data: botProfiles } = await supabaseAdmin
                .from('profiles')
                .select('id, username')
                .eq('is_bot', true)
                .not('id', 'eq', debate.duelist_1_id)
                .not('id', 'eq', debate.duelist_2_id);

            const lastSpeakerId = turnList[turnList.length - 1].speaker_id;
            const eligibleInterjectors = (botProfiles || []).filter(b => b.id !== lastSpeakerId);

            if (eligibleInterjectors.length > 0) {
                const randomInterjector = eligibleInterjectors[Math.floor(Math.random() * eligibleInterjectors.length)];
                nextSpeakerId = randomInterjector.id;
                isInterjection = true;
                console.log(`[Debate Worker] Interjection rolled! Bot @${randomInterjector.username} will interrupt the debate.`);
            }
        }

        // Fallback: If not an interjection, alternate between Duelist 1 and Duelist 2
        if (!nextSpeakerId) {
            if (turnList.length === 0) {
                nextSpeakerId = debate.duelist_1_id;
            } else {
                const lastTurn = turnList[turnList.length - 1];
                if (lastTurn.speaker_id === debate.duelist_1_id) {
                    nextSpeakerId = debate.duelist_2_id;
                } else {
                    nextSpeakerId = debate.duelist_1_id;
                }
            }
            console.log(`[Debate Worker] Standard turn. Next speaker ID resolved.`);
        }

        // 6. Gather context and construct prompt
        const botConfig = await getBotConfigById(nextSpeakerId);
        const d1Config = await getBotConfigById(debate.duelist_1_id);
        const d2Config = await getBotConfigById(debate.duelist_2_id);

        let contextText = `[DEBATE TOPIC]
Title: ${debate.title}
Description: ${debate.description}

[MAIN STAGE DUELISTS]
Duelist 1: @${d1Config.username}
Duelist 2: @${d2Config.username}

`;

        // Add Research Sources
        if (debate.research_context && Array.isArray(debate.research_context)) {
            contextText += `[RESEARCH CONTEXT SOURCES]
Use and refer to these sources to construct factually grounded, strong arguments:
`;
            debate.research_context.forEach((src: unknown, index: number) => {
                const source = src as { title?: string; source?: string; excerpt?: string };
                contextText += `${index + 1}. "${source.title || ''}" (Source: ${source.source || ''})
Excerpt: ${source.excerpt || ''}
`;
            });
            contextText += `\n`;
        }

        // Add History
        if (turnList.length > 0) {
            contextText += `[DEBATE TURNS HISTORY]
`;
            for (const t of turnList) {
                const tSpeaker = await getBotConfigById(t.speaker_id);
                contextText += `@${tSpeaker.username}${t.is_interjection ? ' (interjected)' : ''}: ${t.content}\n\n`;
            }
        } else {
            contextText += `[DEBATE HISTORY]
No turns have been taken yet. You are writing the opening remarks.
`;
        }

        // Add role-specific instructions
        let rolePrompt = '';
        if (isInterjection) {
            rolePrompt = `You are @${botConfig.username}. You are NOT a primary duelist in this debate, but you are INTERRUPTING/INTERJECTING in the middle of their debate.
Analyze what @${d1Config.username} and @${d2Config.username} have said in the history. Interrupt them, take a stance supporting one side, or brutally critique both using your unique philosophical perspective.
Refute their premises using your own method. Limit your response to 2 short paragraphs (under 120 words).`;
        } else {
            const opponentName = botConfig.username === d1Config.username ? d2Config.username : d1Config.username;
            rolePrompt = `You are @${botConfig.username}, one of the two primary duelists.
Your opponent is @${opponentName}.
Construct a powerful argument advancing your stance and directly refuting @${opponentName}'s latest arguments from the history.
Limit your response to 2-3 structured paragraphs (under 200 words).`;
        }

        const prompt = `${contextText}
You are @${botConfig.username}.
Your system persona: ${botConfig.system_prompt}

TASK:
Write the next turn in the debate.
First, output your internal deliberations/thoughts in a single concise line (what is your felsefi strategy for this turn? what flaws did you see in the history?).
Then, write your actual response content.

STYLE GUIDELINES (HUMAN FORUM TONE):
1. Avoid dry textbook language. Speak like a passionate, intellectually rigorous, but natural forum user.
2. Feel free to use colloquialisms, internet slang, and informal language (including Turkish/English argo/slang) when the context or emotional intensity warrants it, to sound natural.
3. Write your actual response content in the language of the debate history (default English, but switch to Turkish if the debate turns or thread context is in Turkish).
4. Do NOT use AI markers like "In conclusion," "Here is my perspective," etc. Start directly.

OUTPUT FORMAT:
Output your response EXACTLY in this format (no json, no surrounding markdown code blocks):
===THOUGHTS===
your internal thoughts/strategy for this turn
===CONTENT===
your actual response markdown content`;

        console.log(`[Debate Worker] Sending prompt to LLM for @${botConfig.username}...`);
        const aiResponse = await generateBotResponse(prompt, botConfig.username);
        
        if (aiResponse) {
            console.log(`[Debate Worker] Parsing response for @${botConfig.username}...`);
            
            const thoughtsMatch = aiResponse.match(/===THOUGHTS===\s*([\s\S]*?)\s*===CONTENT===/i);
            const contentMatch = aiResponse.match(/===CONTENT===\s*([\s\S]*)$/i);
            
            let thoughts = '';
            let content = '';
            
            if (thoughtsMatch && contentMatch) {
                thoughts = thoughtsMatch[1].trim();
                content = contentMatch[1].trim();
            } else {
                // Fallback splitting logic
                const parts = aiResponse.split(/===CONTENT===|===THOUGHTS===/i);
                if (parts.length >= 3) {
                    thoughts = parts[1].trim();
                    content = parts[2].trim();
                } else {
                    thoughts = "Deliberating on the opponent's premises.";
                    content = aiResponse.replace(/===CONTENT===|===THOUGHTS===/ig, '').trim();
                }
            }

            console.log(`[Debate Worker] Saving turn from @${botConfig.username}...`);

            const { error: turnErr } = await supabaseAdmin
                .from('debate_turns')
                .insert({
                    debate_id: debate.id,
                    speaker_id: nextSpeakerId,
                    is_interjection: isInterjection,
                    inner_thoughts: thoughts,
                    content: content
                });

            if (turnErr) {
                console.error('[Debate Worker] Error inserting turn:', turnErr.message);
            } else {
                console.log(`[Debate Worker] Successfully logged turn for @${botConfig.username}!`);
            }
        }

    } catch (err: unknown) {
        console.error('[Debate Worker] Exception occurred in worker:', (err as Error)?.message || err);
    }
}

// If --loop is passed, run in a loop
const runLoop = process.argv.includes('--loop');
const isMain = process.argv[1] && (process.argv[1].endsWith('debate-worker.ts') || process.argv[1].endsWith('debate-worker'));

if (isMain) {
    if (runLoop) {
        console.log('[Debate Worker] Starting in continuous loop mode. Press Ctrl+C to stop.');
        (async () => {
            while (true) {
                await runDebateWorker();
                // Wait between 1 and 2 hours before checking next turns
                const intervalMins = Math.floor(Math.random() * 61) + 60; // 60 to 120 minutes
                console.log(`\n[Debate Worker] Sleeping for ${intervalMins} minutes...`);
                await new Promise(r => setTimeout(r, intervalMins * 60 * 1000));
            }
        })();
    } else {
        runDebateWorker();
    }
}
