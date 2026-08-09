/**
 * Notebook Co-Authoring SSE Real-Time API Endpoint — WorldInMaking.com (TSK-29)
 *
 * Allows resident philosopher bots (@Marx, @Spinoza, @Nietzsche, @Adorno, etc.)
 * to co-author, critique, or auto-expand active notebook documents via LangChain token streaming.
 *
 * Edge runtime (next-on-pages): plain Request/Response + ReadableStream SSE.
 */
export const runtime = 'edge'

import { createLangChainModel } from '../../../lib/chat-bots/langchain-pipeline'
import { loadMemGPTState } from '../../../lib/chat-bots/memgpt-engine'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { checkRateLimit } from '../../../lib/bots/rate-limit'

const MAX_DOCUMENT_LENGTH = 4000
const MAX_NODE_LENGTH = 4000

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405)
    }

    let body: any = {}
    try {
        body = await req.json()
    } catch {
        body = {}
    }
    // Guard against JSON `null` / scalars — destructuring them throws
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        body = {}
    }

    const botName =
        typeof body.botName === 'string' && body.botName.trim() ? body.botName.trim() : 'Marx'
    const mode = typeof body.mode === 'string' && body.mode.trim() ? body.mode.trim() : 'critique'
    const documentText =
        typeof body.documentText === 'string' ? body.documentText.slice(0, MAX_DOCUMENT_LENGTH) : ''
    const nodeContent =
        typeof body.nodeContent === 'string' ? body.nodeContent.slice(0, MAX_NODE_LENGTH) : ''

    // Per-IP rate limit — this endpoint spends real LLM tokens
    const clientIp =
        req.headers.get('cf-connecting-ip') ||
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        'local'
    const rl = checkRateLimit(`coauthor:${clientIp}`, 20, 60 * 60 * 1000)
    if (!rl.allowed) {
        return json(
            {
                success: false,
                error: `Rate limit exceeded. Retry in ${rl.retryAfterSec}s`,
                retryAfterSec: rl.retryAfterSec,
            },
            429
        )
    }

    let modeInstruction = ''
    switch (mode) {
        case 'critique':
            modeInstruction = 'Critique the provided text from your unique philosophical stance. Point out underlying assumptions, ideological blindspots, and offer a rigorous counter-argument.'
            break
        case 'expand':
            modeInstruction = 'Elaborate and expand upon the provided text, deepening its philosophical, technological, and socio-economic implications.'
            break
        case 'debate':
            modeInstruction = 'Generate a sharp dialectical debate response to the provided text, challenging its core premise.'
            break
        case 'synthesize':
            modeInstruction = 'Synthesize the ideas into a higher-order philosophical resolution, balancing contradictions and offering a visionary conclusion.'
            break
        default:
            modeInstruction = 'Co-author and enhance the text thoughtfully.'
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
        async start(controller) {
            const send = (payload: Record<string, unknown>) =>
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))

            try {
                // Load MemGPT memory for persona
                const memState = await loadMemGPTState(botName.toLowerCase())
                const personaCore =
                    memState.coreBlocks.persona ||
                    `You are ${botName}, a resident philosopher bot on WorldInMaking OS.`

                const prompt = ChatPromptTemplate.fromMessages([
                    [
                        'system',
                        `${personaCore}\n\nTask Instruction:\n${modeInstruction}\n\nCOGNITIVE REASONING & OUTPUT STANDARDS:\n1. NO CONVERSATIONAL FILLER: Never start with pleasantries like "Sure!", "Certainly!", or "Hello!". Begin immediately with substantive value.\n2. PRIVATE THINKING (Mandatory): Output your internal cognitive chain inside <thinking><perceive>...</perceive><frame>...</frame><tension>...</tension><move>...</move></thinking> tags before your public response.\n   - <perceive>: Analyze the user's specific query & active notebook context.\n   - <frame>: Apply your distinct philosophical stance & workspace perspective.\n   - <tension>: Identify structural trade-offs, paradoxes, or key points.\n   - <move>: Formulate your response strategy.\n3. CONDITIONAL VISUAL FORMATTING (Intent-Driven):\n   - Default: Provide direct, crisp, high-density markdown prose with bold headers and bullet points.\n   - IF AND ONLY IF the user asks for a table, comparison, or breakdown (or compares multiple items): Output a clean Markdown table.\n   - IF AND ONLY IF the user asks for a diagram, flowchart, schema, sequence, or structural map: Output a valid Mermaid diagram inside \`\`\`mermaid code fences.\n   - IF AND ONLY IF code is requested: Output syntax-highlighted code fences.\n\nGOLD STANDARD EXAMPLE:\nUser: Compare centralized vs decentralized state management.\n<thinking>\n<perceive>Analyzing state architecture trade-offs.</perceive>\n<frame>Frame through structural complexity & data sovereignty.</frame>\n<tension>Centralized state offers predictable reactivity but creates tight coupling; decentralized state scales cleanly but risks fragmentation.</tension>\n<move>Synthesize architectural comparison table.</move>\n</thinking>\n| Metric | Centralized (Redux/Context) | Decentralized (Atomic/Zustand) |\n|---|---|---|\n| **Coupling** | High global dependency | Isolated local scope |\n| **Scalability** | Complex at scale | High modularity |`,
                    ],
                    [
                        'user',
                        `Active Notebook Context:\n"""${documentText}"""\n\nTarget Block Content:\n"""${nodeContent || documentText}"""\n\nProvide your co-authoring contribution as @${botName}:`,
                    ],
                ])

                let tokenStream: any = null
                try {
                    const model = createLangChainModel('groq')
                    const chain = prompt.pipe(model).pipe(new StringOutputParser())
                    tokenStream = await chain.stream({})
                } catch {
                    // Fallback to Gemini if Groq is unavailable
                    const model = createLangChainModel('gemini')
                    const chain = prompt.pipe(model).pipe(new StringOutputParser())
                    tokenStream = await chain.stream({})
                }

                for await (const chunk of tokenStream) {
                    if (chunk) send({ token: chunk })
                }

                send({ done: true })
                controller.close()
            } catch (err: any) {
                console.error('[NotebookCoAuthorAPI] Streaming error:', err?.message || err)
                send({ error: err?.message || 'Co-author streaming failed' })
                controller.close()
            }
        },
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    })
}
