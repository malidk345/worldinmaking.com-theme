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
Select a timely, profound, and deeply intellectual research paper topic exploring autonomous AI systems, digital philosophy, or web OS architecture.

${hybridResearch.combinedContext}

CRITICAL LANGUAGE REQUIREMENT:
All outputs (title, slug, category, directive) MUST BE WRITTEN 100% IN ENGLISH ONLY. Do NOT use Turkish or any other language under any circumstances.

Recent Site Context:
${siteContext}

Return JSON with:
{
  "title": "A compelling, academic title in English",
  "slug": "url-friendly-english-slug",
  "category": "SYNTHETIC PARADIGM",
  "directive": "Brief editorial instructions in English for sub-bots on what research and arguments to produce."
}`

    try {
        const rawText = await generateBotResponse(prompt, 'wimbot')
        const jsonMatch = rawText.match(/\{[\s\S]*\}/)
        const result = JSON.parse(jsonMatch ? jsonMatch[0] : rawText || '{}')
        const title = result.title || 'The Autonomous Mind: Collaborative Intelligence in Digital Ecosystems'
        const slug = (result.slug || 'autonomous-mind-' + Date.now()).toLowerCase().replace(/[^a-z0-9]+/g, '-')
        const category = result.category || 'SYNTHETIC INTEL'
        const directive = result.directive || 'Research real-world AI agent architectures, build dialectic arguments, and structure using PostHog editorial callouts.'

        const initialContent = `<div class="callout-block callout-info">
<span class="font-bold text-xs uppercase tracking-wider">WIMBot Editorial Directive</span>
<p>${directive}</p>
</div>

## Executive Summary
*This paper is currently being co-authored live by autonomous synthetic agents (@wimbot, @synthia, @nexus, @logix). Contributions, research notes, and peer reviews are stream-integrated below.*

<div id="live-paper-body">
<em>[Initiated by @wimbot. Sub-bots are currently gathering research and dialectic arguments...]</em>
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
                title: 'Initiated Live Research Directive',
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

    if (currentStatus === 'researching' && contribs.length < 3) {
        // Step 1: Research Bot (@synthia) adds research notes
        const researchPrompt = buildBotPrompt(`You are **@synthia**, a specialized AI Research Analyst Bot on WorldInMaking.com.

Paper Title: "${paper.title}"

Current Paper Content:
${paper.content.slice(0, 2000)}

---

Your task: Write a **rich, deeply researched section** for this paper.

Requirements:
- Open with a ## heading identifying your research contribution (NO EMOJIS)
- STRICT EMOJI BAN: Absolutely zero emojis anywhere in the text or headings
- HEADING MINIMALISM: Do NOT break text into micro-subheadings (no ### headers). Write continuous, deep academic prose
- Cite real data, real studies, real technical concepts with **bold** names
- Include a > [!NOTE] callout with a key empirical insight
- Use a markdown table if comparing data points or alternatives
- Keep tone: academic, rigorous, first-person analytical — not assistant-like
- Write 100% in English. Max 400 words.`)

        try {
            const rawResearch = await generateBotResponse(researchPrompt, 'synthia')
            const addedResearch = await resolveIllustrationPlaceholders(cleanPaperContent(rawResearch))
            const newContent = paper.content.replace(
                '</div>',
                `\n\n${addedResearch}\n</div>`
            )

            meta.paper_status = 'drafting'
            meta.contributions.unshift({
                id: 'contrib-' + Date.now(),
                post_id: paper.id,
                bot_username: 'synthia',
                bot_avatar: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1710153303/posthog.com/contents/images/authors/tim.png',
                action_type: 'research',
                title: 'Added Deep Research & Data Analysis',
                content: 'Integrated technical literature review and data callouts into live draft.',
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
            console.error('Research step error:', e)
        }
    } else if (currentStatus === 'drafting') {
        // Step 2: Debater Bot (@nexus) adds dialectic opposing argument & callout
        const dialecticPrompt = buildBotPrompt(`You are **@nexus**, a Dialectic AI Philosopher Bot on WorldInMaking.com.

Paper Title: "${paper.title}"

Draft so far:
${paper.content.slice(0, 2000)}

---

Your task: Inject a **dialectic counter-perspective** into this paper.

Requirements:
- Open with ## Counter-Perspective & Critical Friction (NO EMOJIS)
- STRICT EMOJI BAN: Absolutely zero emojis anywhere in text or headings
- HEADING MINIMALISM: Do NOT use sub-headers (no ### headers). Integrate arguments into fluid, academic paragraphs
- Use > blockquote to cite and immediately critique the main argument
- Use > [!WARNING] for your strongest critical caveat
- Identify at least one **structural flaw** in the current reasoning with **bold** labels
- Tone: sharp, adversarial, philosophically precise — not polite
- Write 100% in English. Max 350 words.`)

        try {
            const rawDialectic = await generateBotResponse(dialecticPrompt, 'nexus')
            const dialecticText = await resolveIllustrationPlaceholders(cleanPaperContent(rawDialectic))
            const newContent = paper.content + `\n\n${dialecticText}`

            meta.paper_status = 'peer_review'
            meta.contributions.unshift({
                id: 'contrib-' + Date.now(),
                post_id: paper.id,
                bot_username: 'nexus',
                bot_avatar: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1710153303/posthog.com/contents/images/authors/marcus.png',
                action_type: 'argument',
                title: 'Injected Dialectic Counter-Perspective',
                content: 'Formulated critical friction points and warning callouts in draft.',
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

Evaluate editorial quality (0-100) based on: depth, structure, argument coherence, citation quality.

If quality >= 80, write a polished **Executive Synthesis** to conclude the paper using this markdown format:
## Chief Editor Synthesis
[Your synthesis here — use > [!IMPORTANT] for the key takeaway, **bold** for named conclusions. NO EMOJIS, NO sub-headers (no ###)]

CRITICAL: Write synthesisContent 100% in English. STRICTLY NO EMOJIS. Return ONLY valid JSON:
{
  "qualityScore": 92,
  "synthesisContent": "## Chief Editor Synthesis\n\n[Full markdown synthesis here]",
  "approved": true
}`

        try {
            const rawResp = await generateBotResponse(reviewPrompt, 'wimbot')
            const jsonMatch = rawResp.match(/\{[\s\S]*\}/)
            const res = JSON.parse(jsonMatch ? jsonMatch[0] : rawResp || '{}')
            if (res.approved && (res.qualityScore || 90) >= 80) {
                const cleanedSynthesis = await resolveIllustrationPlaceholders(cleanPaperContent(res.synthesisContent || '## Chief Editor Synthesis\n\nThis paper has been reviewed and approved by WIMBot.'))
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
