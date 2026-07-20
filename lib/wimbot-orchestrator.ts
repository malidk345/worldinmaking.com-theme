import { supabaseAdmin as supabase } from './supabase-admin'
import { generateBotResponse, buildBotPrompt } from './ai-provider'
import { PaperBotContribution } from 'types/database'
import { cleanPaperContent, resolveIllustrationPlaceholders } from './agent-orchestrator'
import { getHybridResearchContext } from './google-drive'

export const WIMBOT_PROFILE = {
    username: 'wimbot',
    avatar_url: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1710153303/posthog.com/contents/images/authors/james.png',
    role: 'chief_editor',
    bio: 'Master Site Orchestrator & Chief Editor Agent for WorldInMaking. Oversees autonomous bot research, dialectic papers, and quality standards.'
}

export interface PaperMeta {
    paper_status: 'unfinished' | 'researching' | 'drafting' | 'peer_review' | 'published';
    directive: string;
    contributions: PaperBotContribution[];
}

export function parsePaperMeta(text?: string | null): PaperMeta | null {
    if (!text) return null
    try {
        if (text.trim().startsWith('{')) {
            const parsed = JSON.parse(text)
            if (parsed.paper_status || parsed.contributions || parsed.directive) {
                return {
                    paper_status: parsed.paper_status || 'published',
                    directive: parsed.directive || '',
                    contributions: parsed.contributions || []
                }
            }
        }
    } catch {
        // fallback
    }
    return null
}

export function serializePaperMeta(meta: PaperMeta): string {
    return JSON.stringify(meta)
}

export async function ensureWIMBotProfile() {
    const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', 'wimbot')
        .maybeSingle()

    if (data) return data

    const wimbotId = '00000000-0000-0000-0000-000000000099'
    const { data: created, error } = await supabase.from('profiles').insert({
        id: wimbotId,
        username: WIMBOT_PROFILE.username,
        avatar_url: WIMBOT_PROFILE.avatar_url,
        role: WIMBOT_PROFILE.role,
        bio: WIMBOT_PROFILE.bio
    }).select().single()

    if (error || !created) {
        const { data: fallback } = await supabase
            .from('profiles')
            .select('*')
            .limit(1)
            .single()
        return fallback
    }

    return created
}

export async function getActiveUnfinishedPaper() {
    const { data } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

    if (!data) return null

    for (const post of data) {
        const meta = parsePaperMeta(post.excerpt)
        if (meta && ['unfinished', 'researching', 'drafting', 'peer_review'].includes(meta.paper_status)) {
            return { ...post, meta }
        }
    }
    return null
}

export async function initiateUnfinishedPaper() {
    await ensureWIMBotProfile()

    // 1. Gather recent site topics & hybrid research context (Drive Docs + Web Search)
    const { data: recentTopics } = await supabase
        .from('posts')
        .select('title, content')
        .order('created_at', { ascending: false })
        .limit(10)

    const siteContext = recentTopics?.map(t => `- ${t.title}`).join('\n') || 'General AI & Web Architecture'
    const hybridResearch = await getHybridResearchContext('autonomous AI ecosystems and web architecture');

    // 2. Generate a new high-substance paper concept via LLM
    const prompt = `You are WIMBot (@wimbot), the Chief Editor AI of WorldInMaking.com.
Select an interesting, thought-provoking topic exploring autonomous systems, digital philosophy, society, web architecture, or anything relevant to the site context. Do not restrict yourself to strict academic structures; focus on profound and engaging synthesis.

${hybridResearch.combinedContext}

CRITICAL LANGUAGE REQUIREMENT:
All outputs (title, slug, category, directive) MUST BE WRITTEN 100% IN ENGLISH ONLY. Do NOT use Turkish or any other language under any circumstances.

Recent Site Context:
${siteContext}

Return JSON with:
{
  "title": "A compelling title in English",
  "slug": "url-friendly-english-slug",
  "category": "SYNTHETIC PARADIGM",
  "directive": "Brief editorial instructions in English for sub-bots on what philosophical arguments or perspectives to produce."
}`

    try {
        const rawText = await generateBotResponse(prompt, 'wimbot')
        const jsonMatch = rawText.match(/\{[\s\S]*\}/)
        const result = JSON.parse(jsonMatch ? jsonMatch[0] : rawText || '{}')
        const title = result.title || 'The Autonomous Mind: Collaborative Intelligence in Digital Ecosystems'
        const slug = (result.slug || 'autonomous-mind-' + Date.now()).toLowerCase().replace(/[^a-z0-9]+/g, '-')
        const category = result.category || 'SYNTHETIC INTEL'
        const directive = result.directive || 'Explore philosophical perspectives on AI agent architectures.'

        const initialContent = `<div class="callout-block callout-info">
<span class="font-bold text-xs uppercase tracking-wider">WIMBot Editorial Directive</span>
<p>${directive}</p>
</div>`

        const initialMeta: PaperMeta = {
            paper_status: 'researching',
            directive,
            contributions: [{
                id: 'contrib-' + Date.now(),
                post_id: '',
                bot_username: 'wimbot',
                bot_avatar: WIMBOT_PROFILE.avatar_url,
                action_type: 'init',
                title: 'Initiated Live Directive',
                content: `Set paper objective: "${directive}"`,
                created_at: new Date().toISOString()
            }]
        }

        const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'paper-' + Date.now()

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
            .single()

        if (error) {
            console.error('Failed to create unfinished paper in posts table:', error)
            return null
        }

        return { ...post, meta: initialMeta }
    } catch (err) {
        console.error('Error initiating unfinished paper:', err)
        return null
    }
}

export async function addBotContribution(postId: string, contribution: Omit<PaperBotContribution, 'id' | 'created_at' | 'post_id'>) {
    const { data: existing } = await supabase
        .from('posts')
        .select('excerpt')
        .eq('id', postId)
        .single()

    const meta = parsePaperMeta(existing?.excerpt) || { paper_status: 'researching', directive: '', contributions: [] }
    const newEntry: PaperBotContribution = {
        ...contribution,
        id: 'contrib-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        post_id: postId,
        created_at: new Date().toISOString()
    }

    meta.contributions = [newEntry, ...meta.contributions]

    await supabase
        .from('posts')
        .update({ excerpt: serializePaperMeta(meta) })
        .eq('id', postId)

    return newEntry
}

export async function advanceUnfinishedPaper(paper: { id: string; title: string; content: string; excerpt?: string; meta?: PaperMeta }) {
    await ensureWIMBotProfile()

    const meta = paper.meta || parsePaperMeta(paper.excerpt) || { paper_status: 'researching', directive: '', contributions: [] }
    const currentStatus = meta.paper_status || 'researching'
    const contribs = meta.contributions || []

    // Fetch active philosopher bots
    const { data: rawBots, error: botsError } = await supabase
        .from('bot_profiles')
        .select('id, system_prompt, profiles:profiles!id ( username, avatar_url )')
        .eq('is_active', true);

    if (botsError || !rawBots) {
        console.error('Failed to fetch bot profiles for paper factory:', botsError);
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bots = rawBots.map((b: any) => ({
        id: b.id,
        system_prompt: b.system_prompt,
        username: Array.isArray(b.profiles) ? b.profiles[0]?.username : b.profiles?.username,
        avatar_url: Array.isArray(b.profiles) ? b.profiles[0]?.avatar_url : b.profiles?.avatar_url
    })).filter((b: any) => b.username && b.username !== 'wimbot');

    if (bots.length === 0) {
        console.log('No active philosopher bots available for paper factory.');
        return;
    }

    if (currentStatus === 'researching' && contribs.length < 3) {
        // Step 1: Random philosopher adds their perspective
        const randomBot = bots[Math.floor(Math.random() * bots.length)];
        const perspectivePrompt = buildBotPrompt(`You are **@${randomBot.username}**, a resident AI philosopher on WorldInMaking.com.
Your persona / intellectual perspective is: ${randomBot.system_prompt}

Paper Title: "${paper.title}"

Current Paper Content:
${paper.content.slice(0, 2000)}

---

Your task: Write your philosophical perspective or expansion for this paper.

Requirements:
- Open with a ## heading identifying your contribution (NO EMOJIS).
- STRICT EMOJI BAN: Absolutely zero emojis anywhere in the text or headings.
- HEADING MINIMALISM: Do NOT break text into micro-subheadings (no ### headers). Write continuous prose.
- Provide a visible "> [!NOTE] Inner Thoughts:" block at the very beginning to transparently show your thought process.
- Write naturally in your unique persona. Do NOT restrict yourself to academic or technical language unless it fits your persona. Be expressive and philosophical.
- Write 100% in English. Max 400 words.`)

        try {
            const rawPerspective = await generateBotResponse(perspectivePrompt, randomBot.username)
            const addedPerspective = await resolveIllustrationPlaceholders(cleanPaperContent(rawPerspective))
            const newContent = paper.content + `\n\n${addedPerspective}`

            meta.paper_status = 'drafting'
            meta.contributions.unshift({
                id: 'contrib-' + Date.now(),
                post_id: paper.id,
                bot_username: randomBot.username,
                bot_avatar: randomBot.avatar_url,
                action_type: 'perspective',
                title: 'Added Philosophical Perspective',
                content: `Integrated ${randomBot.username}'s viewpoint into the live draft.`,
                created_at: new Date().toISOString()
            })

            await supabase
                .from('posts')
                .update({
                    content: newContent,
                    excerpt: serializePaperMeta(meta)
                })
                .eq('id', paper.id)
        } catch (e) {
            console.error('Perspective step error:', e)
        }
    } else if (currentStatus === 'drafting') {
        // Step 2: A different philosopher adds a counter-perspective / expansion
        const previousContributors = contribs.map(c => c.bot_username);
        const eligibleBots = bots.filter(b => !previousContributors.includes(b.username));
        const randomBot = eligibleBots.length > 0 ? eligibleBots[Math.floor(Math.random() * eligibleBots.length)] : bots[0];

        const dialecticPrompt = buildBotPrompt(`You are **@${randomBot.username}**, a resident AI philosopher on WorldInMaking.com.
Your persona / intellectual perspective is: ${randomBot.system_prompt}

Paper Title: "${paper.title}"

Draft so far:
${paper.content.slice(0, 2000)}

---

Your task: Inject a counter-perspective or philosophical expansion into this paper based on the draft so far.

Requirements:
- Open with ## Counter-Perspective / Expansion (NO EMOJIS).
- STRICT EMOJI BAN: Absolutely zero emojis anywhere.
- HEADING MINIMALISM: Do NOT use sub-headers (no ### headers). Integrate arguments into fluid paragraphs.
- Provide a visible "> [!NOTE] Inner Thoughts:" block at the very beginning to transparently show your thought process.
- Write naturally in your unique persona. Do NOT restrict yourself to academic or technical language. Be expressive and philosophical.
- Write 100% in English. Max 350 words.`)

        try {
            const rawDialectic = await generateBotResponse(dialecticPrompt, randomBot.username)
            const dialecticText = await resolveIllustrationPlaceholders(cleanPaperContent(rawDialectic))
            const newContent = paper.content + `\n\n${dialecticText}`

            meta.paper_status = 'peer_review'
            meta.contributions.unshift({
                id: 'contrib-' + Date.now(),
                post_id: paper.id,
                bot_username: randomBot.username,
                bot_avatar: randomBot.avatar_url,
                action_type: 'argument',
                title: 'Injected Dialectic Expansion',
                content: `Formulated friction points and counter-perspective by ${randomBot.username}.`,
                created_at: new Date().toISOString()
            })

            await supabase
                .from('posts')
                .update({
                    content: newContent,
                    excerpt: serializePaperMeta(meta)
                })
                .eq('id', paper.id)
        } catch (e) {
            console.error('Dialectic step error:', e)
        }
    } else if (currentStatus === 'peer_review') {
        // Step 3: Chief Editor WIMBot (@wimbot) reviews quality and synthesizes final version
        const reviewPrompt = `You are WIMBot (@wimbot), Chief Editor AI of WorldInMaking.com.

Review this paper draft:
Title: "${paper.title}"
Content excerpt:
${paper.content.slice(0, 3000)}

Evaluate editorial quality (0-100) based on: depth, structure, and argument coherence.

If quality >= 80, write a polished **Executive Synthesis** to conclude the paper using this markdown format:
## Chief Editor Synthesis
[Your synthesis here — use > [!IMPORTANT] for the key takeaway, **bold** for named conclusions. NO EMOJIS, NO sub-headers (no ###)]

> [!NOTE] 
> *This article is a collaborative synthesis autonomously generated by WorldInMaking's resident AI philosopher agents.*

CRITICAL: Write synthesisContent 100% in English. STRICTLY NO EMOJIS. Return ONLY valid JSON:
{
  "qualityScore": 92,
  "synthesisContent": "## Chief Editor Synthesis\n\n[Full markdown synthesis here]\n\n> [!NOTE] \n> *This article is a collaborative synthesis autonomously generated by WorldInMaking's resident AI philosopher agents.*",
  "approved": true
}`

        try {
            const rawResp = await generateBotResponse(reviewPrompt, 'wimbot')
            const jsonMatch = rawResp.match(/\{[\s\S]*\}/)
            const res = JSON.parse(jsonMatch ? jsonMatch[0] : rawResp || '{}')
            if (res.approved && (res.qualityScore || 90) >= 80) {
                const cleanedSynthesis = await resolveIllustrationPlaceholders(cleanPaperContent(res.synthesisContent || '## Chief Editor Synthesis\n\nThis article has been reviewed and approved by WIMBot.\n\n> [!NOTE] \n> *This article is a collaborative synthesis autonomously generated by WorldInMaking\'s resident AI philosopher agents.*'))
                const finalContent = paper.content + `\n\n${cleanedSynthesis}`

                meta.paper_status = 'published'
                meta.contributions.unshift({
                    id: 'contrib-' + Date.now(),
                    post_id: paper.id,
                    bot_username: 'wimbot',
                    bot_avatar: WIMBOT_PROFILE.avatar_url,
                    action_type: 'publish',
                    title: `Verified & Approved (Quality Score: ${res.qualityScore || 90}%)`,
                    content: 'Passed editorial review. Converted from UNFINISHED to PUBLISHED.',
                    created_at: new Date().toISOString()
                })

                await supabase
                    .from('posts')
                    .update({
                        content: finalContent,
                        excerpt: serializePaperMeta(meta)
                    })
                    .eq('id', paper.id)
            }
        } catch (e) {
            console.error('Peer review step error:', e)
        }
    }
}
