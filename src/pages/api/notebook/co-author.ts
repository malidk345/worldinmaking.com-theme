/**
 * Notebook Co-Authoring SSE Real-Time API Endpoint — WorldInMaking.com (TSK-29)
 *
 * Allows resident philosopher bots (@Marx, @Spinoza, @Nietzsche, @Adorno, etc.)
 * to co-author, critique, or auto-expand active notebook documents via LangChain token streaming.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createLangChainModel } from '../../../lib/chat-bots/langchain-pipeline';
import { loadMemGPTState } from '../../../lib/chat-bots/memgpt-engine';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { botName = 'Marx', mode = 'critique', documentText = '', nodeContent = '' } = req.body || {};

    // Enable Server-Sent Events (SSE) streaming headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
        // Load MemGPT memory for persona
        const memState = await loadMemGPTState(botName.toLowerCase());
        const personaCore = memState.coreBlocks.persona || `You are ${botName}, a resident philosopher bot on WorldInMaking OS.`;

        let modeInstruction = '';
        switch (mode) {
            case 'critique':
                modeInstruction = 'Critique the provided text from your unique philosophical stance. Point out underlying assumptions, ideological blindspots, and offer a rigorous counter-argument.';
                break;
            case 'expand':
                modeInstruction = 'Elaborate and expand upon the provided text, deepening its philosophical, technological, and socio-economic implications.';
                break;
            case 'debate':
                modeInstruction = 'Generate a sharp dialectical debate response to the provided text, challenging its core premise.';
                break;
            case 'synthesize':
                modeInstruction = 'Synthesize the ideas into a higher-order philosophical resolution, balancing contradictions and offering a visionary conclusion.';
                break;
            default:
                modeInstruction = 'Co-author and enhance the text thoughtfully.';
        }

        const prompt = ChatPromptTemplate.fromMessages([
            ['system', `${personaCore}\n\nTask: ${modeInstruction}\nKeep your response concise, analytical, and structured with clean markdown format.`],
            [
                'user',
                `Active Notebook Context:\n"""${documentText.slice(0, 1500)}"""\n\nTarget Block Content:\n"""${nodeContent || documentText}"""\n\nProvide your co-authoring contribution as @${botName}:`,
            ],
        ]);

        const model = createLangChainModel('groq');
        const chain = prompt.pipe(model).pipe(new StringOutputParser());

        const stream = await chain.stream({});

        for await (const chunk of stream) {
            if (chunk) {
                res.write(`data: ${JSON.stringify({ token: chunk })}\n\n`);
            }
        }

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
    } catch (err: any) {
        console.error('[NotebookCoAuthorAPI] Streaming error:', err?.message || err);
        res.write(`data: ${JSON.stringify({ error: err?.message || 'Co-author streaming failed' })}\n\n`);
        res.end();
    }
}
