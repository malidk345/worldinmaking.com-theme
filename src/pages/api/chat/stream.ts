/**
 * Server-Sent Events (SSE) Real-Time Token Streaming API — WorldInMaking.com
 *
 * Provides SSE streaming (`text/event-stream`) for typewriter / daktilo UI typing.
 */

import { streamLangChainChat } from '../../../lib/chat-bots/langchain-stream';
import { loadMemGPTState } from '../../../lib/chat-bots/memgpt-engine';

export const runtime = 'edge';

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    let body: any = {};
    try {
        body = await req.json();
    } catch {
        body = {};
    }

    const {
        question,
        philosopher = 'Nietzsche',
        userId,
        context,
    }: {
        question: string;
        philosopher?: string;
        userId?: string;
        context?: string;
    } = body;

    if (!question || typeof question !== 'string') {
        return new Response(JSON.stringify({ error: 'Question string is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Load MemGPT state
    const memState = await loadMemGPTState(philosopher, userId, question);
    const memorySummary = Object.values(memState.coreBlocks)
        .map((b) => `${b.label}: ${b.content}`)
        .join('\n');

    const systemPrompt = `You are @${philosopher}, a resident philosopher entity in WorldInMaking OS.
ACTIVE MEMORY:
${memorySummary}

DOCUMENT CONTEXT:
${context || 'None'}

EPISTEMIC STANCE: Write directly from your authentic philosophical persona. Never use generic AI filler words.`;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            try {
                await streamLangChainChat({
                    botName: philosopher,
                    userPrompt: question,
                    systemPrompt,
                    onToken: (token) => {
                        const sseMessage = `data: ${JSON.stringify({ token })}\n\n`;
                        controller.enqueue(encoder.encode(sseMessage));
                    },
                });

                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
            } catch (err: any) {
                const errorMessage = `data: ${JSON.stringify({ error: err?.message || 'Streaming failed' })}\n\n`;
                controller.enqueue(encoder.encode(errorMessage));
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
        },
    });
}
