import type { NextApiRequest, NextApiResponse } from 'next'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText } from 'ai'
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
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
    } = req.body

    if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'Question string is required' })
    }

    const persona: BotPersona = extractPersona('', philosopher)
    const systemPrompt = buildPersonaHeader(persona, mood)

    const userPrompt = `TASK TYPE: ${taskType}\nQUESTION / TOPIC:\n${question}\n\nProvide your response adhering strictly to your epistemic stance and style rules.`

    // Option 1: Vercel AI SDK with OpenAI (if key present)
    if (process.env.OPENAI_API_KEY) {
        try {
            const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
            const result = streamText({
                model: openai('gpt-4o-mini'),
                system: systemPrompt,
                prompt: userPrompt,
            })
            return result.pipeDataStreamToResponse(res)
        } catch (e) {
            console.error('[VercelAISDK] OpenAI streaming error:', e)
        }
    }

    // Option 2: Vercel AI SDK with Google Gemini (if key present)
    if (process.env.GEMINI_API_KEY) {
        try {
            const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })
            const result = streamText({
                model: google('gemini-1.5-flash'),
                system: systemPrompt,
                prompt: userPrompt,
            })
            return result.pipeDataStreamToResponse(res)
        } catch (e) {
            console.error('[VercelAISDK] Gemini streaming error:', e)
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
                const text = data?.choices?.[0]?.message?.content
                if (text) {
                    return res.status(200).json({
                        success: true,
                        philosopher: persona.name,
                        epistemicStance: persona.epistemicStance,
                        reply: cleanAIOutput(text),
                        provider: 'groq',
                        confident: true,
                    })
                }
            }
        } catch (e) {
            console.error('[PhilosopherBot] Groq fallback error:', e)
        }
    }

    // Fallback response if no API keys are configured
    const fallbackReply = `The question regarding "${question.slice(0, 50)}..." strikes at fundamental premises that demand rigorous philosophical analysis.`
    return res.status(200).json({
        success: true,
        philosopher: persona.name,
        epistemicStance: persona.epistemicStance,
        reply: fallbackReply,
        provider: 'fallback',
        confident: true,
    })
}
