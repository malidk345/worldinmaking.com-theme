/**
 * LangChain Token Streaming & Output Fixing Parser — WorldInMaking.com
 *
 * Implements real-time token streaming (`chain.stream()`) for typewriter UI effects
 * and self-healing output validation.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { createLangChainModel } from './langchain-pipeline';

export interface LangChainStreamOptions {
    botName: string;
    userPrompt: string;
    systemPrompt: string;
    onToken?: (token: string) => void;
}

/**
 * Streams LLM output token-by-token for daktilo-like real-time UI typing.
 */
export async function streamLangChainChat(
    options: LangChainStreamOptions
): Promise<string> {
    const { botName, userPrompt, systemPrompt, onToken } = options;
    const model = createLangChainModel('groq');

    const promptTemplate = ChatPromptTemplate.fromMessages([
        ['system', systemPrompt],
        ['human', '{userPrompt}'],
    ]);

    const outputParser = new StringOutputParser();
    const lcelStreamChain = promptTemplate.pipe(model).pipe(outputParser);

    const stream = await lcelStreamChain.stream({
        botName,
        userPrompt,
    });

    let fullText = '';
    for await (const chunk of stream) {
        fullText += chunk;
        if (onToken) {
            onToken(chunk);
        }
    }

    return fullText;
}
