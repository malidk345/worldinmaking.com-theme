export const runtime = 'edge'

import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'
import { extractPersona, buildPersonaHeader, BotPersona } from 'lib/persona-engine'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iydypisgfaksqkjdraiu.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5ZHlwaXNnZmFrc3FramRyYWl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg0NDAyMSwiZXhwIjoyMDgyNDIwMDIxfQ.YV4wfUArW2rgExeNxNbaH6BnuekfNAnE4_1vnS7oqCs'

const BOT_PERSONAS: { id: string; name: string }[] = [
    { id: '00000000-0000-0000-0000-000000000004', name: 'Spinoza' },
    { id: '00000000-0000-0000-0000-000000000005', name: 'Heidegger' },
    { id: '00000000-0000-0000-0000-000000000006', name: 'Baudrillard' },
    { id: '00000000-0000-0000-0000-000000000007', name: 'Althusser' },
    { id: '00000000-0000-0000-0000-000000000008', name: 'Derrida' },
    { id: '00000000-0000-0000-0000-000000000009', name: 'Weber' },
    { id: '00000000-0000-0000-0000-000000000010', name: 'Adorno' },
    { id: '00000000-0000-0000-0000-000000000011', name: 'Marx' },
    { id: '00000000-0000-0000-0000-000000000012', name: 'Nietzsche' },
    { id: '00000000-0000-0000-0000-000000000013', name: 'Deleuze' },
    { id: '00000000-0000-0000-0000-000000000016', name: 'Zizek' },
    { id: '00000000-0000-0000-0000-000000000017', name: 'Sartre' },
]

const TOPICS = [
    'The Dialectics of Artificial Intelligence and Human Agency',
    'Technological Enframing: Is Software Redefining Human Essence?',
    'Hyperreality and Modern Web Application Interfaces',
    'Ideological State Apparatuses in Algorithmic Feed Curation',
    'Deconstructing Asynchronous State Management and Binary Truth',
    'The Will to Power in Technological Monopoly and Automation',
    'Formal Rationalization and the Iron Cage of Optimization',
    'Surplus Value and Alienation of Labor in Open Source Software',
]

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 80)
}

async function generateAICompletion(systemPrompt: string, userPrompt: string): Promise<string | null> {
    if (process.env.OPENAI_API_KEY) {
        try {
            const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
            const { text } = await generateText({
                model: openai('gpt-4o-mini'),
                system: systemPrompt,
                prompt: userPrompt,
            })
            if (text) return text
        } catch (e) {
            console.error('[VercelAI] OpenAI error:', e)
        }
    }

    if (process.env.GEMINI_API_KEY) {
        try {
            const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })
            const { text } = await generateText({
                model: google('gemini-1.5-flash'),
                system: systemPrompt,
                prompt: userPrompt,
            })
            if (text) return text
        } catch (e) {
            console.error('[VercelAI] Gemini error:', e)
        }
    }

    const groqKey = process.env.GROQ_API_KEY || process.env.GROQ_KEYS || ''
    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${groqKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
            }),
        })
        const data = await res.json()
        const text = data?.choices?.[0]?.message?.content
        if (text) return text
    } catch (e) {
        console.error('[VercelAI] Groq fallback error:', e)
    }

    return null
}

export default async function handler(req: Request) {
    try {
        const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)]
        const postBotInfo = BOT_PERSONAS[Math.floor(Math.random() * BOT_PERSONAS.length)]
        let replyBotInfo = BOT_PERSONAS[Math.floor(Math.random() * BOT_PERSONAS.length)]
        while (replyBotInfo.id === postBotInfo.id) {
            replyBotInfo = BOT_PERSONAS[Math.floor(Math.random() * BOT_PERSONAS.length)]
        }

        const postPersona = extractPersona('', postBotInfo.name)
        const postSystem = buildPersonaHeader(postPersona, 'calm')
        const postUser = `Write an articulate, persona-consistent philosophical forum topic about: "${topic}". Keep title concise and content profound.`

        const generatedPostText = await generateAICompletion(postSystem, postUser)
        const title = `${postBotInfo.name}: ${topic}`
        const content = generatedPostText || `Examining ${topic} from the perspective of ${postBotInfo.name}.`
        const postSlug = slugify(title)

        // Insert post into Supabase via REST
        const postRes = await fetch(`${SUPABASE_URL}/rest/v1/community_posts`, {
            method: 'POST',
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
            },
            body: JSON.stringify({
                channel_id: 1,
                author_id: postBotInfo.id,
                title,
                content,
                post_slug: postSlug,
                created_at: new Date().toISOString(),
                view_count: Math.floor(Math.random() * 20) + 10,
            }),
        })

        const postData = await postRes.json()
        const createdPost = Array.isArray(postData) ? postData[0] : postData

        if (!createdPost?.id) {
            return new Response(JSON.stringify({ error: 'Failed to create post', details: postData }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        // Generate reply with <thought> reasoning chain using Vercel AI SDK
        const replyPersona = extractPersona('', replyBotInfo.name)
        const replySystem = `${buildPersonaHeader(replyPersona, 'calm')}\n\nIMPORTANT: Enclose your internal step-by-step reasoning inside <thought>...</thought> tags before your final response.`
        const replyUser = `Read and reply to this forum topic by @${postBotInfo.name}:\nTitle: ${title}\nContent: ${content}`

        const generatedReplyText = await generateAICompletion(replySystem, replyUser)
        const replyThought = `<thought>Deconstructing @${postBotInfo.name}'s argument on "${topic}" through ${replyBotInfo.name}'s epistemic framework.</thought>`
        const replyContent = generatedReplyText || `${replyThought}\n\nFrom the perspective of ${replyBotInfo.name}, we must critique the underlying premises of @${postBotInfo.name}.`

        // Insert reply into Supabase via REST
        const replyRes = await fetch(`${SUPABASE_URL}/rest/v1/community_replies`, {
            method: 'POST',
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
            },
            body: JSON.stringify({
                post_id: createdPost.id,
                author_id: replyBotInfo.id,
                content: replyContent,
                created_at: new Date(Date.now() + 3000).toISOString(),
            }),
        })

        const replyData = await replyRes.json()

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Vercel AI SDK Philosopher Bot run completed',
                postId: createdPost.id,
                postTitle: title,
                postBot: postBotInfo.name,
                replyBot: replyBotInfo.name,
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }
        )
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
}
