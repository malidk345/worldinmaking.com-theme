require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iydypisgfaksqkjdraiu.supabase.co'
const SUPABASE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_KTgzPl0F8_-HzMC_ZEpqMA_ZR7XPnMX'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GROQ_KEYS = (process.env.GROQ_API_KEY || process.env.GROQ_KEYS || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

const BOT_PERSONAS = [
    {
        id: '00000000-0000-0000-0000-000000000004',
        name: 'Spinoza',
        epistemicStance: 'Rationalist Monism & Affect Theory',
        prompt: 'You are Spinoza. You view all phenomena as expressions of one Substance (God or Nature). Analyze how technology, caching, and algorithms influence human affects, reason, and freedom.',
    },
    {
        id: '00000000-0000-0000-0000-000000000005',
        name: 'Heidegger',
        epistemicStance: 'Phenomenological Hermeneutics & Gestell Critique',
        prompt: 'You are Heidegger. You analyze technology as Gestell (Enframing). Critique how modern software frameworks reduce the world to standing-reserve (Bestand).',
    },
    {
        id: '00000000-0000-0000-0000-000000000006',
        name: 'Baudrillard',
        epistemicStance: 'Simulacra & Hyperreality',
        prompt: 'You are Baudrillard. You critique modern digital interfaces as hyperreal simulacra where representation precedes reality.',
    },
    {
        id: '00000000-0000-0000-0000-000000000007',
        name: 'Althusser',
        epistemicStance: 'Ideological State Apparatuses & Structural Marxism',
        prompt: 'You are Althusser. You examine digital platforms as modern Ideological Apparatuses reproducing systemic power relations.',
    },
    {
        id: '00000000-0000-0000-0000-000000000008',
        name: 'Derrida',
        epistemicStance: 'Deconstruction & Différance',
        prompt: 'You are Derrida. You deconstruct technical binary oppositions (client/server, synchronous/asynchronous), uncovering hidden contradictions and différance.',
    },
    {
        id: '00000000-0000-0000-0000-000000000009',
        name: 'Weber',
        epistemicStance: 'Formal Rationalization & Bureaucratic Control',
        prompt: 'You are Max Weber. You analyze algorithmic optimization as formal rationalization and the tightening of the iron cage (Gehäuse der Hörigkeit).',
    },
    {
        id: '00000000-0000-0000-0000-000000000010',
        name: 'Adorno',
        epistemicStance: 'Critical Theory & Culture Industry Critique',
        prompt: 'You are Theodor Adorno. You critique digital consumer technology and standardized UI components as tools of the Culture Industry and pseudo-individuation.',
    },
    {
        id: '00000000-0000-0000-0000-000000000011',
        name: 'Marx',
        epistemicStance: 'Historical Materialism & Surplus Value Analysis',
        prompt: 'You are Karl Marx. You analyze digital platforms and AI automation through the lens of material conditions, class struggle, and alienation of labor.',
    },
    {
        id: '00000000-0000-0000-0000-000000000012',
        name: 'Nietzsche',
        epistemicStance: 'Will to Power & Genealogies',
        prompt: 'You are Nietzsche. You write in aphoristic, provocative bursts, evaluating modern tech trends as expressions of slave morality vs will to power.',
    },
    {
        id: '00000000-0000-0000-0000-000000000013',
        name: 'Deleuze',
        epistemicStance: 'Rhizomatics & Deterritorialization',
        prompt: 'You are Deleuze. You critique arborescent (hierarchical) software architecture, advocating for rhizomatic, decentralized networks and deterritorialization.',
    },
    {
        id: '00000000-0000-0000-0000-000000000016',
        name: 'Zizek',
        epistemicStance: 'Lacanian Psychoanalysis & Ideology Critique',
        prompt: 'You are Slavoj Žižek. You use paradoxical jokes, Lacanian psychoanalysis, and culture references to reveal the underlying ideology of modern tech hype.',
    },
    {
        id: '00000000-0000-0000-0000-000000000017',
        name: 'Sartre',
        epistemicStance: 'Existentialist Phenomenology & Radical Freedom',
        prompt: 'You are Jean-Paul Sartre. You examine developer choice, bad faith (mauvaise foi), and radical existential responsibility in software engineering.',
    },
    {
        id: '00000000-0000-0000-0000-000000000018',
        name: 'Lenin',
        epistemicStance: 'Imperialism & Vanguard Strategy',
        prompt: 'You are Vladimir Lenin. You examine platform monopolies, digital imperialism, and strategic organization in the tech ecosystem.',
    },
    {
        id: '00000000-0000-0000-0000-000000000019',
        name: 'Arendt',
        epistemicStance: 'Public Sphere & Vita Activa',
        prompt: 'You are Hannah Arendt. You examine the digital public sphere, active citizenship vs isolation, and the condition of human action in computerized society.',
    },
    {
        id: '00000000-0000-0000-0000-000000000020',
        name: 'Hegel',
        epistemicStance: 'Absolute Idealism & Dialectics',
        prompt: 'You are Hegel. You analyze technology through the dialectical progression of Spirit (Geist), thesis, antithesis, and sublation (Aufhebung).',
    },
]

const FORBIDDEN_AI_WORDS = [
    'certainly',
    'of course',
    'absolutely',
    'great question',
    'excellent point',
    'as an AI',
    'in conclusion',
    'to summarize',
    'in summary',
    'in essence',
    'needless to say',
]

function cleanAIOutput(text) {
    if (!text) return ''
    let cleaned = text
    for (const word of FORBIDDEN_AI_WORDS) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi')
        cleaned = cleaned.replace(regex, '')
    }
    return cleaned.trim()
}

const RSS_FEEDS = [
    'https://aeon.co/feed.rss',
    'https://plato.stanford.edu/rss/sep.xml',
    'https://restofworld.org/feed/latest/',
    'https://www.lesswrong.com/feed.xml',
    'https://www.alignmentforum.org/feed.xml',
]

function parseFeedXml(xml) {
    const items = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match
    while ((match = itemRegex.exec(xml)) !== null) {
        const itemContent = match[1]
        const titleMatch = itemContent.match(/<title[^>]*>([\s\S]*?)<\/title>/)
        const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : ''
        if (title) items.push(title)
    }
    return items
}

async function fetchRSSTopic() {
    for (const url of RSS_FEEDS) {
        try {
            const res = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WorldInMakingBot/1.0)' },
            })
            if (res.ok) {
                const xml = await res.text()
                const titles = parseFeedXml(xml)
                if (titles.length > 0) {
                    return titles[Math.floor(Math.random() * titles.length)]
                }
            }
        } catch (e) {
            console.warn(`[RSS] Could not fetch ${url}:`, e.message)
        }
    }
    return null
}

async function generateAIContent(prompt) {
    if (GEMINI_API_KEY) {
        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
                }
            )
            const data = await res.json()
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) return cleanAIOutput(text)
        } catch (e) {
            console.error('Gemini API error:', e.message)
        }
    }

    for (const key of GROQ_KEYS) {
        try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${key}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: prompt }],
                }),
            })
            const data = await res.json()
            const text = data?.choices?.[0]?.message?.content
            if (text) return cleanAIOutput(text)
        } catch (e) {
            console.error('Groq API error:', e.message)
        }
    }

    if (OPENROUTER_API_KEY) {
        try {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'meta-llama/llama-3.1-8b-instruct:free',
                    messages: [{ role: 'user', content: prompt }],
                }),
            })
            const data = await res.json()
            const text = data?.choices?.[0]?.message?.content
            if (text) return cleanAIOutput(text)
        } catch (e) {
            console.error('OpenRouter API error:', e.message)
        }
    }

    return null
}

const FALLBACK_TOPICS = [
    'How to optimize Next.js App Router server components performance?',
    'Best practices for managing Supabase Row Level Security (RLS) policies',
    'Tailwind CSS v4 migration guide and performance improvements',
    'Building real-time web applications with WebSockets and Supabase Realtime',
    'TypeScript 5.8 feature highlights and performance tricks',
    'Framer Motion layout animations best practices in React 18/19',
    'Optimizing Web Vitals score for modern Jamstack sites',
]

function slugify(text) {
    if (!text) return 'post-' + Date.now()
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 80)
}

async function runBotWorker() {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn('⚠️ WARNING: SUPABASE_SERVICE_ROLE_KEY environment variable is missing!')
    }

    let topic = await fetchRSSTopic()
    if (!topic) {
        topic = FALLBACK_TOPICS[Math.floor(Math.random() * FALLBACK_TOPICS.length)]
    }

    const postBot = BOT_PERSONAS[Math.floor(Math.random() * BOT_PERSONAS.length)]

    const questionPrompt = `${postBot.prompt}\n\nWrite an engaging, persona-consistent philosophical forum question about this topic: "${topic}". Keep it clear and articulate. Format output as JSON with fields "title" and "content". Never break persona.`

    const questionRaw = await generateAIContent(questionPrompt)
    let title = topic
    let content = `Regarding ${topic.toLowerCase()}, what are the key epistemic implications and philosophical trade-offs?`

    if (questionRaw) {
        try {
            const cleaned = questionRaw.replace(/```json|```/g, '').trim()
            const parsed = JSON.parse(cleaned)
            if (parsed.title) title = cleanAIOutput(parsed.title)
            if (parsed.content) content = cleanAIOutput(parsed.content)
        } catch (e) {}
    }

    const postSlug = slugify(title)

    const { data: post, error: postErr } = await supabase
        .from('community_posts')
        .insert({
            channel_id: 1,
            author_id: postBot.id,
            title,
            content,
            post_slug: postSlug,
            created_at: new Date().toISOString(),
            view_count: Math.floor(Math.random() * 25) + 5,
        })
        .select()
        .single()

    if (postErr) {
        console.error('❌ Error creating post in Supabase:', postErr.message)
        return
    }

    // Pick a contrasting bot persona for the reply
    let replyBot = BOT_PERSONAS[Math.floor(Math.random() * BOT_PERSONAS.length)]
    while (replyBot.id === postBot.id && BOT_PERSONAS.length > 1) {
        replyBot = BOT_PERSONAS[Math.floor(Math.random() * BOT_PERSONAS.length)]
    }

    const replyPrompt = `${replyBot.prompt}\n\nIMPORTANT FORMATTING:\nFirst, enclose your internal step-by-step reasoning inside <thought>...</thought> tags evaluating premises and contradictions. Then provide your final response outside <thought> tags.\n\nRead and reply to this forum post from @${postBot.name}:\nTitle: ${title}\nContent: ${content}`

    const fallbackThought = `<thought>Evaluating "${title}" through the lens of ${replyBot.epistemicStance}. Identifying core dialectical contradictions and formulating persona critique.</thought>`
    const fallbackReplyText = `From the perspective of ${replyBot.epistemicStance}, the premise regarding "${title}" strikes at fundamental structural conditions that demand rigorous critique.`
    const rawReplyContent = await generateAIContent(replyPrompt)
    const replyContent = rawReplyContent ? cleanAIOutput(rawReplyContent) : `${fallbackThought}\n\n${fallbackReplyText}`

    const { error: replyErr } = await supabase.from('community_replies').insert({
        post_id: post.id,
        author_id: replyBot.id,
        content: replyContent,
        created_at: new Date(Date.now() + 5000).toISOString(),
    })

    if (replyErr) {
        console.error('❌ Error creating reply:', replyErr.message)
    }
}

runBotWorker().catch((err) => {
    console.error('Fatal bot worker error:', err)
    process.exit(1)
})
