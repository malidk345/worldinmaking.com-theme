export const runtime = 'edge'

import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText, generateText } from 'ai'
import { extractPersona, buildPersonaHeader, BotPersona, TaskType } from 'lib/persona-engine'

const FORBIDDEN_AI_WORDS = [
    'certainly', 'of course', 'absolutely', 'great question', 'excellent point',
    'as an ai', 'i must note', 'it is worth noting', 'it is important to note',
    'fascinating', 'i\'d be happy to', 'i\'m here to', 'let\'s explore',
    'in conclusion', 'to summarize', 'in summary', 'in essence',
    'needless to say', 'it goes without saying',
]

function cleanAIOutput(text: string): string {
    if (!text) return ''
    let cleaned = text
    for (const word of FORBIDDEN_AI_WORDS) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi')
        cleaned = cleaned.replace(regex, '')
    }
    return cleaned.replace(/\n{3,}/g, '\n\n').trim()
}

function parseThoughtAndReply(rawText: string): { thought: string; reply: string } {
    let thought = ''
    let reply = rawText

    const match = rawText.match(/<thought>([\s\S]*?)<\/thought>/i)
    if (match) {
        thought = cleanAIOutput(match[1].trim())
        reply = cleanAIOutput(rawText.replace(/<thought>[\s\S]*?<\/thought>/i, '').trim())
    } else {
        reply = cleanAIOutput(rawText)
    }

    return { thought, reply }
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        })
    }

    let body: any = {}
    try {
        if (typeof (req as any).json === 'function') {
            body = await req.json()
        } else if ((req as any).body) {
            body = typeof (req as any).body === 'string' ? JSON.parse((req as any).body) : (req as any).body
        }
    } catch {
        body = (req as any).body || {}
    }

    const {
        question,
        philosopher = 'Nietzsche',
        mood = 'calm',
        taskType = 'community_reply',
    }: {
        question: string
        philosopher?: string
        mood?: string
        taskType?: TaskType
    } = body

    if (!question || typeof question !== 'string') {
        return new Response(JSON.stringify({ error: 'Question string is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        })
    }

    const persona: BotPersona = extractPersona('', philosopher)
    const systemPrompt = `${buildPersonaHeader(persona, mood)}\n\nIMPORTANT FORMATTING INSTRUCTION:\nFirst, enclose your internal philosophical reasoning & thought process step-by-step inside <thought>...</thought> tags. Describe how your persona evaluates the premises and formulates the argument. Then, provide your final persona response outside the <thought> tags.`

    const userPrompt = `TASK TYPE: ${taskType}\nQUESTION / TOPIC:\n${question}\n\nProvide your response adhering strictly to your epistemic stance, thought process formatting, and style rules.`

    // Option 1: Vercel AI SDK with OpenAI (if key present)
    if (process.env.OPENAI_API_KEY) {
        try {
            const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
            const { text } = await generateText({
                model: openai('gpt-4o-mini'),
                system: systemPrompt,
                prompt: userPrompt,
            })
            if (text) {
                const { thought, reply } = parseThoughtAndReply(text)
                return new Response(
                    JSON.stringify({
                        success: true,
                        philosopher: persona.name,
                        epistemicStance: persona.epistemicStance,
                        thought,
                        reply,
                        provider: 'openai',
                        confident: true,
                    }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    }
                )
            }
        } catch (e) {
            console.error('[VercelAISDK] OpenAI completion error:', e)
        }
    }

    // Option 2: Vercel AI SDK with Google Gemini (if key present)
    if (process.env.GEMINI_API_KEY) {
        try {
            const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })
            const { text } = await generateText({
                model: google('gemini-1.5-flash'),
                system: systemPrompt,
                prompt: userPrompt,
            })
            if (text) {
                const { thought, reply } = parseThoughtAndReply(text)
                return new Response(
                    JSON.stringify({
                        success: true,
                        philosopher: persona.name,
                        epistemicStance: persona.epistemicStance,
                        thought,
                        reply,
                        provider: 'gemini',
                        confident: true,
                    }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    }
                )
            }
        } catch (e) {
            console.error('[VercelAISDK] Gemini completion error:', e)
        }
    }

    // Option 3: Fallback via Groq or OpenRouter
    const groqKeys = (process.env.GROQ_API_KEY || process.env.GROQ_KEYS || '')
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)

    for (const key of groqKeys) {
        try {
            const fetchRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${key}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    temperature: 0.7,
                }),
            })
            if (fetchRes.ok) {
                const data = await fetchRes.json()
                const rawText = data?.choices?.[0]?.message?.content
                if (rawText) {
                    const { thought, reply } = parseThoughtAndReply(rawText)
                    return new Response(
                        JSON.stringify({
                            success: true,
                            philosopher: persona.name,
                            epistemicStance: persona.epistemicStance,
                            thought,
                            reply,
                            provider: 'groq',
                            confident: true,
                        }),
                        {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' },
                        }
                    )
                }
            }
        } catch (e) {
            console.error('[PhilosopherBot] Groq fallback error:', e)
        }
    }

    // Fallback response with synthetic reasoning
    const defaultThought = `Analyzing "${question.slice(0, 40)}..." through the lens of ${persona.epistemicStance}. Identifying structural assumptions and formulating persona critique.`
    const defaultReply = `The question regarding "${question.slice(0, 50)}..." strikes at fundamental premises that demand rigorous philosophical analysis.`
    return new Response(
        JSON.stringify({
            success: true,
            philosopher: persona.name,
            epistemicStance: persona.epistemicStance,
            thought: defaultThought,
            reply: defaultReply,
            provider: 'fallback',
            confident: true,
        }),
        {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }
    )
}
