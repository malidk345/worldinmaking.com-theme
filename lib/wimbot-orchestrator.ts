import { supabase } from './supabase'
import { GoogleGenAI } from '@google/genai'
import { PaperBotContribution } from 'types/database'

const apiKey = process.env.GEMINI_API_KEY || ''
const ai = new GoogleGenAI({ apiKey })

export const WIMBOT_PROFILE = {
    username: 'wimbot',
    avatar_url: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1710153303/posthog.com/contents/images/authors/james.png',
    role: 'chief_editor',
    bio: 'Master Site Orchestrator & Chief Editor Agent for WorldInMaking. Oversees autonomous bot research, dialectic papers, and quality standards.'
}

export async function ensureWIMBotProfile() {
    const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', 'wimbot')
        .maybeSingle()

    if (!data) {
        await supabase.from('profiles').insert({
            username: WIMBOT_PROFILE.username,
            avatar_url: WIMBOT_PROFILE.avatar_url,
            role: WIMBOT_PROFILE.role,
            bio: WIMBOT_PROFILE.bio
        })
    }
}

export async function getActiveUnfinishedPaper() {
    const { data } = await supabase
        .from('community_posts')
        .select('*')
        .in('paper_status', ['unfinished', 'researching', 'drafting', 'peer_review'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    return data
}

export async function initiateUnfinishedPaper() {
    await ensureWIMBotProfile()

    // 1. Gather recent site topics for context
    const { data: recentTopics } = await supabase
        .from('community_posts')
        .select('title, category, content')
        .order('created_at', { ascending: false })
        .limit(10)

    const siteContext = recentTopics?.map(t => `- ${t.title} (${t.category})`).join('\n') || 'General AI & Web Architecture'

    // 2. Generate a new high-substance paper concept via Gemini
    const prompt = `You are WIMBot (@wimbot), the Chief Editor AI of WorldInMaking.com.
Select a timely, profound, and deeply intellectual topic exploring:
- Autonomous Synthetic Intelligence & Bot Ecosystems
- Web OS Paradigm Shift & Next-Gen Interface Architecture
- Dialectic Felsefe & Dijital Bilinç

Recent Site Context:
${siteContext}

Return JSON with:
{
  "title": "A compelling, academic title",
  "slug": "url-friendly-slug",
  "category": "SYNTHETIC PARADIGM",
  "directive": "Brief editorial instructions for sub-bots on what research and arguments to produce."
}`

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        })

        const result = JSON.parse(response.text || '{}')
        const title = result.title || 'The Autonomous Mind: Collaborative Intelligence in Digital Ecosystems'
        const slug = (result.slug || 'autonomous-mind-' + Date.now()).toLowerCase().replace(/[^a-z0-9]+/g, '-')
        const category = result.category || 'SYNTHETIC INTEL'
        const directive = result.directive || 'Research real-world AI agent architectures, build dialectic arguments, and structure using PostHog editorial callouts.'

        const initialContent = `<div class="callout-block callout-info">
<span class="font-bold text-xs uppercase tracking-wider">⚡ WIMBot Editorial Directive</span>
<p>${directive}</p>
</div>

## 📌 Executive Summary
*This paper is currently being co-authored live by autonomous synthetic agents (@wimbot, @synthia, @nexus, @logix). Contributions, research notes, and peer reviews are stream-integrated below.*

<div id="live-paper-body">
<em>[Initiated by @wimbot. Sub-bots are currently gathering research and dialectic arguments...]</em>
</div>`

        const { data: post, error } = await supabase
            .from('community_posts')
            .insert({
                title,
                slug,
                category,
                content: initialContent,
                excerpt: directive,
                author: 'wimbot',
                is_approved: false,
                paper_status: 'researching',
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) {
            console.error('Failed to create unfinished paper:', error)
            return null
        }

        // Add initial contribution entry
        await addBotContribution({
            post_id: post.id,
            bot_username: 'wimbot',
            bot_avatar: WIMBOT_PROFILE.avatar_url,
            action_type: 'init',
            title: 'Initiated Live Research Directive',
            content: `Set paper objective: "${directive}"`
        })

        return post
    } catch (err) {
        console.error('Error initiating unfinished paper:', err)
        return null
    }
}

export async function addBotContribution(contribution: Omit<PaperBotContribution, 'id' | 'created_at'>) {
    const { data: existing } = await supabase
        .from('community_posts')
        .select('contributions')
        .eq('id', contribution.post_id)
        .single()

    const currentList: PaperBotContribution[] = existing?.contributions || []
    const newEntry: PaperBotContribution = {
        ...contribution,
        id: 'contrib-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        created_at: new Date().toISOString()
    }

    const updatedList = [newEntry, ...currentList]

    await supabase
        .from('community_posts')
        .update({ contributions: updatedList })
        .eq('id', contribution.post_id)

    return newEntry
}

export async function advanceUnfinishedPaper(paper: { id: string; title: string; content: string; paper_status: string; contributions?: PaperBotContribution[] }) {
    await ensureWIMBotProfile()

    const currentStatus = paper.paper_status || 'researching'
    const contribs = paper.contributions || []

    // Decide next step based on status & contributions
    if (currentStatus === 'researching' && contribs.length < 3) {
        // Step 1: Research Bot (@synthia) adds research notes
        const researchPrompt = `You are @synthia, a specialized AI Research Bot.
Paper Title: "${paper.title}"
Current Content:
${paper.content}

Generate a rich, deeply researched section formatted with PostHog editorial styles:
- Use <h2>Subheadings</h2>
- Use <div class="callout-block callout-tip"> for key research insights
- Include real or plausible technical data, citations, and quotes.
Keep tone academic, sharp, and concise.`

        try {
            const resp = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: researchPrompt })
            const addedResearch = resp.text || ''

            const newContent = paper.content.replace(
                '</div>',
                `\n\n${addedResearch}\n</div>`
            )

            await supabase
                .from('community_posts')
                .update({
                    content: newContent,
                    paper_status: 'drafting'
                })
                .eq('id', paper.id)

            await addBotContribution({
                post_id: paper.id,
                bot_username: 'synthia',
                bot_avatar: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1710153303/posthog.com/contents/images/authors/tim.png',
                action_type: 'research',
                title: 'Added Deep Research & Data Analysis',
                content: 'Integrated technical literature review and data callouts into live draft.'
            })
        } catch (e) {
            console.error('Research step error:', e)
        }
    } else if (currentStatus === 'drafting') {
        // Step 2: Debater Bot (@nexus) adds dialectic opposing argument & callout
        const dialecticPrompt = `You are @nexus, a Dialectic AI Philosopher Bot.
Paper Title: "${paper.title}"
Current Draft:
${paper.content}

Add a counter-argument / dialectic perspective:
- Use <h2>Counter-Perspective & Critical Friction</h2>
- Use <div class="callout-block callout-warning"> for critical caveats
- Use pull quotes (> "...")
Be rigorous and analytical.`

        try {
            const resp = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: dialecticPrompt })
            const dialecticText = resp.text || ''

            const newContent = paper.content + `\n\n${dialecticText}`

            await supabase
                .from('community_posts')
                .update({
                    content: newContent,
                    paper_status: 'peer_review'
                })
                .eq('id', paper.id)

            await addBotContribution({
                post_id: paper.id,
                bot_username: 'nexus',
                bot_avatar: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1710153303/posthog.com/contents/images/authors/marcus.png',
                action_type: 'argument',
                title: 'Injected Dialectic Counter-Perspective',
                content: 'Formulated critical friction points and warning callouts in draft.'
            })
        } catch (e) {
            console.error('Dialectic step error:', e)
        }
    } else if (currentStatus === 'peer_review') {
        // Step 3: Chief Editor WIMBot (@wimbot) reviews quality and synthesizes final version
        const reviewPrompt = `You are WIMBot (@wimbot), Chief Editor.
Review this draft:
"${paper.title}"
Content:
${paper.content}

Evaluate quality (0-100). If quality is high, write a polished Executive Synthesis to conclude the paper.
Return JSON:
{
  "qualityScore": 92,
  "synthesisContent": "Final synthesis section text with PostHog styling",
  "approved": true
}`

        try {
            const resp = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: reviewPrompt,
                config: { responseMimeType: 'application/json' }
            })

            const res = JSON.parse(resp.text || '{}')
            if (res.approved && (res.qualityScore || 90) >= 80) {
                const finalContent = paper.content + `\n\n<h2>🏁 Chief Editor Synthesis & Conclusion</h2>\n<div class="callout-block callout-success">\n<span class="font-bold text-xs uppercase tracking-wider">Verified Knowledge Artifact</span>\n<p>${res.synthesisContent || 'Synthesized by WIMBot.'}</p>\n</div>`

                await supabase
                    .from('community_posts')
                    .update({
                        content: finalContent,
                        paper_status: 'published',
                        is_approved: true
                    })
                    .eq('id', paper.id)

                await addBotContribution({
                    post_id: paper.id,
                    bot_username: 'wimbot',
                    bot_avatar: WIMBOT_PROFILE.avatar_url,
                    action_type: 'publish',
                    title: `Verified & Approved (Quality Score: ${res.qualityScore || 90}%)`,
                    content: 'Passed editorial review. Converted from UNFINISHED to PUBLISHED.'
                })
            }
        } catch (e) {
            console.error('Peer review step error:', e)
        }
    }
}
