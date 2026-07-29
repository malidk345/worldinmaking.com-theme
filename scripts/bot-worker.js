const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iydypisgfaksqkjdraiu.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_KTgzPl0F8_-HzMC_ZEpqMA_ZR7XPnMX'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GROQ_API_KEY = process.env.GROQ_API_KEY
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

async function generateAIContent(prompt) {
    if (GEMINI_API_KEY) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            })
            const data = await res.json()
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) return text
        } catch (e) {
            console.error('Gemini API error:', e.message)
        }
    }

    if (GROQ_API_KEY) {
        try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: prompt }]
                })
            })
            const data = await res.json()
            const text = data?.choices?.[0]?.message?.content
            if (text) return text
        } catch (e) {
            console.error('Groq API error:', e.message)
        }
    }

    if (OPENROUTER_API_KEY) {
        try {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'meta-llama/llama-3.1-8b-instruct:free',
                    messages: [{ role: 'user', content: prompt }]
                })
            })
            const data = await res.json()
            const text = data?.choices?.[0]?.message?.content
            if (text) return text
        } catch (e) {
            console.error('OpenRouter API error:', e.message)
        }
    }

    return null
}

const TOPICS = [
    "How to optimize Next.js App Router server components performance?",
    "Best practices for managing Supabase Row Level Security (RLS) policies",
    "Tailwind CSS v4 migration guide and performance improvements",
    "Building real-time web applications with WebSockets and Supabase Realtime",
    "TypeScript 5.8 feature highlights and performance tricks",
    "Framer Motion layout animations best practices in React 18/19",
    "Optimizing Web Vitals score for modern Jamstack sites",
]

async function runBotWorker() {
    console.log('🤖 Starting Autonomous Forum Bot Worker...')

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn('⚠️ WARNING: SUPABASE_SERVICE_ROLE_KEY environment variable is missing!')
        console.warn('⚠️ Please add SUPABASE_SERVICE_ROLE_KEY to GitHub Secrets (Repository Settings -> Secrets and variables -> Actions) so the bot can write to Supabase.')
    }

    const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)]
    console.log(`📌 Selected topic: "${topic}"`)

    const questionPrompt = `Generate a realistic technical question that a developer would ask on a developer community forum about: "${topic}". Keep it concise, engaging, and clear. Format output as JSON with fields "title" and "content".`

    const questionRaw = await generateAIContent(questionPrompt)
    let title = topic
    let content = `I am looking into ${topic.toLowerCase()}. What are the current best practices and performance implications? Any examples or advice would be appreciated!`

    if (questionRaw) {
        try {
            const cleaned = questionRaw.replace(/```json|```/g, '').trim()
            const parsed = JSON.parse(cleaned)
            if (parsed.title) title = parsed.title
            if (parsed.content) content = parsed.content
        } catch (e) {
            console.log('Using fallback title/content parsing')
        }
    }

    console.log(`📝 Creating post: "${title}"`)

    const { data: post, error: postErr } = await supabase
        .from('community_posts')
        .insert({
            title,
            content,
            created_at: new Date().toISOString(),
            view_count: Math.floor(Math.random() * 25) + 5
        })
        .select()
        .single()

    if (postErr) {
        console.error('❌ Error creating post in Supabase:', postErr.message)
        if (postErr.code === '42501' || postErr.message?.includes('row-level security')) {
            console.error('👉 CAUSE: Row Level Security (RLS) blocked insertion. Add SUPABASE_SERVICE_ROLE_KEY to GitHub Repository Secrets.')
        }
        return
    }

    console.log(`✅ Post created with ID: ${post?.id}`)

    // Generate AI Reply
    const replyPrompt = `Answer this developer forum question concisely and helpfully:\nQuestion Title: ${title}\nQuestion Body: ${content}`
    const replyContent = await generateAIContent(replyPrompt) || `Great question! When dealing with ${topic.toLowerCase()}, key aspects include proper caching, bundle size reduction, and monitoring metrics.`

    console.log('💬 Generating reply...')

    const { error: replyErr } = await supabase
        .from('community_replies')
        .insert({
            post_id: post.id,
            content: replyContent,
            created_at: new Date(Date.now() + 5000).toISOString()
        })

    if (replyErr) {
        console.error('❌ Error creating reply:', replyErr.message)
    } else {
        console.log('✅ Bot reply posted successfully!')
    }

    console.log('🎉 Bot worker run complete!')
}

runBotWorker().catch(err => {
    console.error('Fatal bot worker error:', err)
    process.exit(1)
})
