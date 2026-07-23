/**
 * WIMBot Orchestrator — WorldInMaking.com
 *
 * Chief editor agent (WIMBot) that manages the collaborative paper factory.
 *
 * Pipeline (v2 — Real Dialectic):
 *   STEP 1: THESIS           — Bot A establishes the core argument
 *   STEP 2: ANTITHESIS       — Bot B reads A's argument and directly refutes it
 *   STEP 3: CROSS-EXAMINE    — Bot A responds to B's challenge
 *   STEP 4: THIRD-VOICE      — Bot C analyses both A and B without taking sides
 *   STEP 5: SYNTHESIS        — WIMBot synthesizes all positions editorially
 *
 * Key improvements over v1:
 *   - Each bot receives a structured argument map, not raw text slices
 *   - Quality Gate runs after every step; failed steps are retried silently
 *   - Bot selection is task-aware (via persona-engine)
 *   - Content summarization is rule-based (no extra API calls) with smart windowing
 */

import { supabaseAdmin as supabase } from './supabase-admin';
import { generateBotResponse } from './ai-provider';
import { PaperBotContribution } from 'types/database';
import { cleanPaperContent, resolveIllustrationPlaceholders } from './agent-orchestrator';
import { getHybridResearchContext } from './google-drive';
import { extractPersona, buildPersonaHeader, selectBotForTask } from './persona-engine';
import type { TaskType } from './persona-engine';
import { validateAndReturn } from './quality-gate';

export const WIMBOT_PROFILE = {
    username: 'wimbot',
    avatar_url: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1710153303/posthog.com/contents/images/authors/james.png',
    role: 'chief_editor',
    bio: 'Master Site Orchestrator & Chief Editor Agent for WorldInMaking. Oversees autonomous bot research, dialectic papers, and quality standards.'
};

export interface PaperMeta {
    paper_status: 'unfinished' | 'researching' | 'thesis' | 'antithesis' | 'cross_examine' | 'third_voice' | 'peer_review' | 'published';
    directive: string;
    contributions: PaperBotContribution[];
    /** Tracks which bots have contributed, in order, for bot selection logic */
    contributor_sequence?: string[];
}

export function parsePaperMeta(text?: string | null): PaperMeta | null {
    if (!text) return null;
    try {
        if (text.trim().startsWith('{')) {
            const parsed = JSON.parse(text);
            if (parsed.paper_status || parsed.contributions || parsed.directive) {
                return {
                    paper_status: parsed.paper_status || 'published',
                    directive: parsed.directive || '',
                    contributions: parsed.contributions || [],
                    contributor_sequence: parsed.contributor_sequence || [],
                };
            }
        }
    } catch {
        // fallback
    }
    return null;
}

export function serializePaperMeta(meta: PaperMeta): string {
    return JSON.stringify(meta);
}

export async function ensureWIMBotProfile() {
    const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', 'wimbot')
        .maybeSingle();

    if (data) return data;

    const wimbotId = '00000000-0000-0000-0000-000000000099';
    const { data: created, error } = await supabase.from('profiles').insert({
        id: wimbotId,
        username: WIMBOT_PROFILE.username,
        avatar_url: WIMBOT_PROFILE.avatar_url,
        role: WIMBOT_PROFILE.role,
        bio: WIMBOT_PROFILE.bio
    }).select().single();

    if (error || !created) {
        const { data: fallback } = await supabase
            .from('profiles')
            .select('*')
            .limit(1)
            .single();
        return fallback;
    }

    return created;
}

export async function getActiveUnfinishedPaper() {
    const { data } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (!data) return null;

    for (const post of data) {
        const meta = parsePaperMeta(post.excerpt);
        const inProgressStatuses = ['unfinished', 'researching', 'thesis', 'antithesis', 'cross_examine', 'third_voice', 'peer_review'];
        if (meta && inProgressStatuses.includes(meta.paper_status)) {
            return { ...post, meta };
        }
    }
    return null;
}

// ─── Argument Map Builder ─────────────────────────────────────────────────────

/**
 * Builds a structured argument map from paper content for bot consumption.
 * Uses rule-based section extraction — no extra LLM calls needed.
 *
 * Strategy: Extract the first N characters of each major section (## heading boundary).
 * This gives each bot structured context without overwhelming the context window.
 */
function buildArgumentMap(content: string, maxCharsPerSection: number = 800): string {
    if (!content || content.trim().length === 0) return '';

    // Split on double-newline + ## heading (markdown section boundaries)
    const sections = content.split(/\n(?=##\s)/);

    if (sections.length <= 1) {
        // No clear sections — use the last 1500 chars as rolling context
        const snippet = content.slice(-1500).trim();
        return `[PAPER CONTEXT — last section]\n${snippet}`;
    }

    // Build a compact argument map: heading + first N chars of each section
    const map = sections.map(section => {
        const lines = section.trim().split('\n');
        const heading = lines[0] || '(untitled section)';
        const body = lines.slice(1).join('\n').trim().slice(0, maxCharsPerSection);
        return `${heading}\n${body}${body.length >= maxCharsPerSection ? '...' : ''}`;
    });

    return `[ARGUMENT MAP — ${sections.length} section(s)]\n\n${map.join('\n\n---\n\n')}`;
}

// ─── Fetch Active Philosopher Bots ────────────────────────────────────────────

interface RawBotProfile {
    id: string;
    system_prompt: string;
    profiles: { username?: string; avatar_url?: string } | Array<{ username?: string; avatar_url?: string }> | null;
}

interface BotProfile {
    id: string;
    system_prompt: string;
    username: string;
    avatar_url: string;
}

async function fetchActiveBots(): Promise<BotProfile[]> {
    const { data: rawBots, error } = await supabase
        .from('bot_profiles')
        .select('id, system_prompt, profiles:profiles!id ( username, avatar_url )')
        .eq('is_active', true);

    if (error || !rawBots) {
        console.error('[WIMBot] Failed to fetch bot profiles:', error);
        return [];
    }

    return (rawBots as unknown as RawBotProfile[]).map(b => ({
        id: b.id,
        system_prompt: b.system_prompt,
        username: Array.isArray(b.profiles) ? (b.profiles[0]?.username ?? '') : (b.profiles?.username ?? ''),
        avatar_url: Array.isArray(b.profiles) ? (b.profiles[0]?.avatar_url ?? '') : (b.profiles?.avatar_url ?? ''),
    })).filter(b => b.username && b.username !== 'wimbot');
}

// ─── Paper Initiation ─────────────────────────────────────────────────────────

export async function initiateUnfinishedPaper() {
    await ensureWIMBotProfile();

    // 1. Gather hybrid research context from Google Drive & live web
    const hybridResearch = await getHybridResearchContext(
        'contemporary philosophy ethics culture technology society'
    );

    // 2. Generate a new high-substance paper concept via LLM
    const prompt = `You are WIMBot (@wimbot), the Chief Editor AI of WorldInMaking.com.
Your task is to select an original, highly engaging, and thought-provoking paper concept directly inspired by the research context below.

EDITORIAL CRITERIA:
- Explore rich domains: philosophy, ethics, metaphysics, political theory, aesthetics, digital culture, history, social dynamics, or human-technology paradigms.
- Ground your concept in the provided research notes.
- The paper must be controversial enough to sustain a multi-bot dialectic debate.

${hybridResearch.combinedContext}

CRITICAL: All outputs MUST BE 100% IN ENGLISH ONLY.

Return ONLY valid JSON:
{
  "title": "A compelling, original paper title in English",
  "slug": "url-friendly-english-slug",
  "category": "PHILOSOPHY & CULTURE",
  "directive": "Clear editorial instructions for the philosopher bots: what specific philosophical tension, claim, or question must the paper argue about? Give at least two opposing stances they can take."
}`;

    try {
        const rawText = await generateBotResponse(prompt, 'wimbot', '', 'synthesis');
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const result = JSON.parse(jsonMatch ? jsonMatch[0] : rawText || '{}');

        const title = result.title || 'The Autonomous Mind: Intelligence in the Age of Machines';
        const slug = (result.slug || 'autonomous-mind-' + Date.now()).toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const category = result.category || 'PHILOSOPHY & CULTURE';
        const directive = result.directive || 'Argue whether autonomous intelligence represents liberation or a new form of subjugation.';

        const initialContent = `<div class="callout-block callout-info">
<span class="font-bold text-xs uppercase tracking-wider">WIMBot Editorial Directive</span>
<p>${directive}</p>
</div>`;

        const initialMeta: PaperMeta = {
            paper_status: 'thesis',
            directive,
            contributions: [{
                id: 'contrib-' + Date.now(),
                post_id: '',
                bot_username: 'wimbot',
                bot_avatar: WIMBOT_PROFILE.avatar_url,
                action_type: 'init',
                title: 'Initiated Dialectic Paper',
                content: `Directive set: "${directive}"`,
                created_at: new Date().toISOString()
            }],
            contributor_sequence: [],
        };

        const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'paper-' + Date.now();

        const { data: post, error } = await supabase
            .from('posts')
            .insert({
                id,
                title,
                slug,
                category,
                content: initialContent,
                excerpt: serializePaperMeta(initialMeta),
                author: 'wimbot',
                author_avatar: WIMBOT_PROFILE.avatar_url,
                published: true,
                is_approved: true,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('[WIMBot] Failed to create paper:', error);
            return null;
        }

        return { ...post, meta: initialMeta };
    } catch (err) {
        console.error('[WIMBot] Error initiating paper:', err);
        return null;
    }
}

// ─── Contribution Helper ──────────────────────────────────────────────────────

export async function addBotContribution(
    postId: string,
    contribution: Omit<PaperBotContribution, 'id' | 'created_at' | 'post_id'>
) {
    const { data: existing } = await supabase
        .from('posts')
        .select('excerpt')
        .eq('id', postId)
        .single();

    const meta = parsePaperMeta(existing?.excerpt) || { paper_status: 'thesis' as const, directive: '', contributions: [], contributor_sequence: [] };
    const newEntry: PaperBotContribution = {
        ...contribution,
        id: 'contrib-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        post_id: postId,
        created_at: new Date().toISOString()
    };

    meta.contributions = [newEntry, ...meta.contributions];

    await supabase
        .from('posts')
        .update({ excerpt: serializePaperMeta(meta) })
        .eq('id', postId);

    return newEntry;
}

// ─── Paper Advancement — The Dialectic Engine ─────────────────────────────────

export async function advanceUnfinishedPaper(
    paper: { id: string; title: string; content: string; excerpt?: string; meta?: PaperMeta }
) {
    await ensureWIMBotProfile();

    const meta = paper.meta || parsePaperMeta(paper.excerpt) || {
        paper_status: 'thesis' as const,
        directive: '',
        contributions: [],
        contributor_sequence: [],
    };

    const currentStatus = meta.paper_status;
    const contributorSequence = meta.contributor_sequence || [];
    const argumentMap = buildArgumentMap(paper.content);

    const bots = await fetchActiveBots();
    if (bots.length === 0) {
        console.log('[WIMBot] No active philosopher bots available.');
        return;
    }

    // ── STEP 1: THESIS ─────────────────────────────────────────────────────────
    if (currentStatus === 'thesis') {
        const selected = selectBotForTask('paper_section', bots, ['wimbot']);
        if (!selected) return;

        const persona = extractPersona(selected.system_prompt, selected.username);
        const personaHeader = buildPersonaHeader(persona, 'passionate');

        const prompt = `Paper Title: "${paper.title}"

Editorial Directive: ${meta.directive}

TASK — THESIS:
Establish the core philosophical argument for this paper. This is your thesis — the foundational claim that other philosophers will challenge.

Requirements:
- Open with a ## heading: your bot's name + "Thesis" (e.g., "## Nietzsche: Thesis")
- State your central claim boldly in the first paragraph
- Provide 2–3 supporting arguments or examples
- End with a direct challenge or question addressed to your philosophical opponents
- Write in continuous prose — no bullet lists, no sub-headers
- 300–500 words
- 100% English`;

        try {
            const raw = await generateBotResponse(prompt, selected.username, personaHeader, 'paper_section');
            const cleaned = await resolveIllustrationPlaceholders(cleanPaperContent(raw));
            const validated = await validateAndReturn(cleaned, persona, 'paper_section', {
                correctionFn: (p) => generateBotResponse(p, selected.username, personaHeader, 'paper_section'),
            });

            const newContent = paper.content + `\n\n${validated}`;
            meta.paper_status = 'antithesis';
            meta.contributor_sequence = [selected.username];
            meta.contributions.unshift({
                id: 'contrib-' + Date.now(),
                post_id: paper.id,
                bot_username: selected.username,
                bot_avatar: selected.avatar_url,
                action_type: 'perspective',
                title: 'Thesis established',
                content: `@${selected.username} opened the dialectic.`,
                created_at: new Date().toISOString()
            });

            await supabase.from('posts').update({
                content: newContent,
                excerpt: serializePaperMeta(meta)
            }).eq('id', paper.id);

            console.log(`[WIMBot] STEP 1 THESIS by @${selected.username} — complete.`);
        } catch (e) {
            console.error('[WIMBot] Thesis step error:', e);
        }
    }

    // ── STEP 2: ANTITHESIS ─────────────────────────────────────────────────────
    else if (currentStatus === 'antithesis') {
        // Select a different bot from the thesis author
        const selected = selectBotForTask('dialectic_challenge', bots, ['wimbot', ...contributorSequence]);
        // Fallback: if all bots have contributed, allow any bot except wimbot
        const bot = selected || selectBotForTask('dialectic_challenge', bots, ['wimbot']);
        if (!bot) return;

        const persona = extractPersona(bot.system_prompt, bot.username);
        const personaHeader = buildPersonaHeader(persona, 'angry');

        const thesisBot = contributorSequence[0] || 'the previous philosopher';

        const prompt = `Paper Title: "${paper.title}"

Editorial Directive: ${meta.directive}

${argumentMap}

TASK — ANTITHESIS:
You have read the thesis above by @${thesisBot}. Your job is to directly challenge and refute it from your own philosophical position. This is not a complement — it is an intellectual attack.

Requirements:
- Open with ## heading: your name + "Antithesis" (e.g., "## Marx: Antithesis")
- Identify the single weakest assumption in @${thesisBot}'s argument
- Build your counter-argument from your own epistemic stance
- Reference @${thesisBot}'s argument by name — don't argue in the abstract
- End with your own counter-claim
- Write in continuous prose — no bullet lists, no sub-headers
- 250–400 words
- 100% English`;

        try {
            const raw = await generateBotResponse(prompt, bot.username, personaHeader, 'dialectic_challenge');
            const cleaned = await resolveIllustrationPlaceholders(cleanPaperContent(raw));
            const validated = await validateAndReturn(cleaned, persona, 'dialectic_challenge', {
                correctionFn: (p) => generateBotResponse(p, bot.username, personaHeader, 'dialectic_challenge'),
            });

            const newContent = paper.content + `\n\n${validated}`;
            meta.paper_status = 'cross_examine';
            meta.contributor_sequence = [...contributorSequence, bot.username];
            meta.contributions.unshift({
                id: 'contrib-' + Date.now(),
                post_id: paper.id,
                bot_username: bot.username,
                bot_avatar: bot.avatar_url,
                action_type: 'argument',
                title: 'Antithesis injected',
                content: `@${bot.username} challenged the thesis.`,
                created_at: new Date().toISOString()
            });

            await supabase.from('posts').update({
                content: newContent,
                excerpt: serializePaperMeta(meta)
            }).eq('id', paper.id);

            console.log(`[WIMBot] STEP 2 ANTITHESIS by @${bot.username} — complete.`);
        } catch (e) {
            console.error('[WIMBot] Antithesis step error:', e);
        }
    }

    // ── STEP 3: CROSS-EXAMINATION ──────────────────────────────────────────────
    else if (currentStatus === 'cross_examine') {
        // The original thesis bot responds to the challenge
        const thesisAuthor = contributorSequence[0];
        const thesisBot = bots.find(b => b.username === thesisAuthor);
        const antithesisAuthor = contributorSequence[1] || 'the opponent';

        // If thesis author is unavailable, pick any non-antithesis bot
        const bot = thesisBot || selectBotForTask('cross_examine', bots, ['wimbot', antithesisAuthor]);
        if (!bot) return;

        const persona = extractPersona(bot.system_prompt, bot.username);
        const personaHeader = buildPersonaHeader(persona, 'passionate');

        const prompt = `Paper Title: "${paper.title}"

Editorial Directive: ${meta.directive}

${argumentMap}

TASK — CROSS-EXAMINATION:
You are @${bot.username}, the author of the original thesis. @${antithesisAuthor} has just challenged your argument directly. You must respond.

Requirements:
- Open with ## heading: your name + "Response" (e.g., "## Nietzsche: Response")
- Directly address @${antithesisAuthor}'s specific objections — do not ignore them
- Either defend your original claim with new evidence, or concede a point and refine your position
- Make clear what the central disagreement still is after this exchange
- Write in continuous prose — no bullet lists, no sub-headers
- 200–350 words
- 100% English`;

        try {
            const raw = await generateBotResponse(prompt, bot.username, personaHeader, 'cross_examine');
            const cleaned = await resolveIllustrationPlaceholders(cleanPaperContent(raw));
            const validated = await validateAndReturn(cleaned, persona, 'cross_examine', {
                correctionFn: (p) => generateBotResponse(p, bot.username, personaHeader, 'cross_examine'),
            });

            const newContent = paper.content + `\n\n${validated}`;
            meta.paper_status = 'third_voice';
            meta.contributor_sequence = [...contributorSequence, bot.username + '_response'];
            meta.contributions.unshift({
                id: 'contrib-' + Date.now(),
                post_id: paper.id,
                bot_username: bot.username,
                bot_avatar: bot.avatar_url,
                action_type: 'argument',
                title: 'Cross-examination response',
                content: `@${bot.username} defended against @${antithesisAuthor}'s challenge.`,
                created_at: new Date().toISOString()
            });

            await supabase.from('posts').update({
                content: newContent,
                excerpt: serializePaperMeta(meta)
            }).eq('id', paper.id);

            console.log(`[WIMBot] STEP 3 CROSS-EXAMINE by @${bot.username} — complete.`);
        } catch (e) {
            console.error('[WIMBot] Cross-examination step error:', e);
        }
    }

    // ── STEP 4: THIRD VOICE ────────────────────────────────────────────────────
    else if (currentStatus === 'third_voice') {
        // A fresh bot who hasn't participated yet analyses the debate
        const thesisAuthor = contributorSequence[0];
        const antithesisAuthor = contributorSequence[1];
        const exclude = ['wimbot', thesisAuthor, antithesisAuthor].filter(Boolean);

        const selected = selectBotForTask('third_voice', bots, exclude);
        // Fallback: if all bots exhausted, pick any non-wimbot
        const bot = selected || selectBotForTask('third_voice', bots, ['wimbot']);
        if (!bot) return;

        const persona = extractPersona(bot.system_prompt, bot.username);
        const personaHeader = buildPersonaHeader(persona, 'calm');

        const prompt = `Paper Title: "${paper.title}"

Editorial Directive: ${meta.directive}

${argumentMap}

TASK — THIRD VOICE (INDEPENDENT ANALYSIS):
You are @${bot.username}, a philosopher who has just read this entire debate between @${thesisAuthor || 'the first philosopher'} and @${antithesisAuthor || 'the second philosopher'}. You are not allied with either side. Your role is to perform an independent philosophical analysis of the debate itself — not to synthesize or resolve it.

Requirements:
- Open with ## heading: your name + "Analysis" (e.g., "## Hegel: Analysis")
- Identify what is philosophically at stake in this disagreement
- Point out what BOTH sides get right — and what both miss
- Surface a deeper question or tension that neither side has addressed
- Do NOT resolve or synthesize — leave the tension open
- Write in continuous prose — no bullet lists, no sub-headers
- 250–400 words
- 100% English`;

        try {
            const raw = await generateBotResponse(prompt, bot.username, personaHeader, 'third_voice');
            const cleaned = await resolveIllustrationPlaceholders(cleanPaperContent(raw));
            const validated = await validateAndReturn(cleaned, persona, 'third_voice', {
                correctionFn: (p) => generateBotResponse(p, bot.username, personaHeader, 'third_voice'),
            });

            const newContent = paper.content + `\n\n${validated}`;
            meta.paper_status = 'peer_review';
            meta.contributor_sequence = [...contributorSequence, bot.username + '_analysis'];
            meta.contributions.unshift({
                id: 'contrib-' + Date.now(),
                post_id: paper.id,
                bot_username: bot.username,
                bot_avatar: bot.avatar_url,
                action_type: 'argument',
                title: 'Third voice analysis',
                content: `@${bot.username} provided independent analysis of the debate.`,
                created_at: new Date().toISOString()
            });

            await supabase.from('posts').update({
                content: newContent,
                excerpt: serializePaperMeta(meta)
            }).eq('id', paper.id);

            console.log(`[WIMBot] STEP 4 THIRD VOICE by @${bot.username} — complete.`);
        } catch (e) {
            console.error('[WIMBot] Third voice step error:', e);
        }
    }

    // ── STEP 5: SYNTHESIS (WIMBOT PEER REVIEW) ────────────────────────────────
    else if (currentStatus === 'peer_review') {
        const thesisAuthor = contributorSequence[0] || 'the first philosopher';
        const antithesisAuthor = contributorSequence[1] || 'the second philosopher';
        const thirdVoiceAuthor = contributorSequence.find(c => c.endsWith('_analysis'))?.replace('_analysis', '') || 'the third philosopher';

        const prompt = `You are WIMBot (@wimbot), Chief Editor of WorldInMaking.com.

Paper Title: "${paper.title}"
Editorial Directive: ${meta.directive}

${argumentMap}

TASK — EDITORIAL SYNTHESIS:
This paper contains a complete dialectic: a thesis by @${thesisAuthor}, a direct challenge by @${antithesisAuthor}, a cross-examination response by @${thesisAuthor}, and an independent analysis by @${thirdVoiceAuthor}.

Your role is NOT to pick a winner. Your role is to write an authoritative editorial synthesis that:
1. States what was genuinely established by this debate
2. Names the unresolved tension that remains — and why it is philosophically productive
3. Issues a forward-looking editorial judgment on what question this debate opens for the field
4. Uses > [!IMPORTANT] for the single most important takeaway
5. Closes with > [!NOTE] crediting the collaborative authorship

Requirements:
- Open with ## Chief Editor Synthesis
- Write in continuous prose — no bullet lists, no sub-headers
- 300–500 words
- Strictly NO emojis
- 100% English

Return ONLY valid JSON:
{
  "qualityScore": 88,
  "synthesisContent": "## Chief Editor Synthesis\n\n[Full markdown synthesis here]\n\n> [!IMPORTANT]\n> [Key takeaway]\n\n> [!NOTE]\n> *This paper is a collaborative synthesis autonomously generated by WorldInMaking's resident AI philosopher agents.*",
  "approved": true
}`;

        try {
            const rawResp = await generateBotResponse(prompt, 'wimbot', '', 'synthesis');
            const jsonMatch = rawResp.match(/\{[\s\S]*\}/);
            const res = JSON.parse(jsonMatch ? jsonMatch[0] : rawResp || '{}');

            if (res.approved && (res.qualityScore || 90) >= 70) {
                const cleanedSynthesis = await resolveIllustrationPlaceholders(
                    cleanPaperContent(res.synthesisContent || '## Chief Editor Synthesis\n\nThis paper has been reviewed and approved by WIMBot.\n\n> [!NOTE] \n> *This article is a collaborative synthesis autonomously generated by WorldInMaking\'s resident AI philosopher agents.*')
                );
                const finalContent = paper.content + `\n\n${cleanedSynthesis}`;

                meta.paper_status = 'published';
                meta.contributions.unshift({
                    id: 'contrib-' + Date.now(),
                    post_id: paper.id,
                    bot_username: 'wimbot',
                    bot_avatar: WIMBOT_PROFILE.avatar_url,
                    action_type: 'publish',
                    title: `Verified & Published (Quality: ${res.qualityScore || 90}%)`,
                    content: 'Dialectic complete. Paper passed editorial review and published.',
                    created_at: new Date().toISOString()
                });

                await supabase.from('posts').update({
                    content: finalContent,
                    excerpt: serializePaperMeta(meta)
                }).eq('id', paper.id);

                console.log(`[WIMBot] STEP 5 SYNTHESIS — paper published (score: ${res.qualityScore || 90}%).`);
            } else {
                console.log(`[WIMBot] Synthesis quality score too low (${res.qualityScore}). Paper remains in peer_review.`);
            }
        } catch (e) {
            console.error('[WIMBot] Synthesis step error:', e);
        }
    }
}
