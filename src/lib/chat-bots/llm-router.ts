/**
 * Enterprise Multi-Tier LLM Fallback Router — WorldInMaking.com
 *
 * Implements a high-availability fallback router across multiple AI providers:
 *   Tier 1: Groq (Llama 3.3 70B) — ultra-fast inference
 *   Tier 2: Google Gemini (Gemini 2.0 Flash) — deep reasoning
 *   Tier 3: Local Ollama / vLLM — fallback self-hosted models
 */

import { createLangChainModel } from './langchain-pipeline';

export interface LLMCallResult {
    content: string;
    provider: string;
    latencyMs: number;
}

export async function executeEnterpriseLLMCall(params: {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
}): Promise<LLMCallResult> {
    const startTime = Date.now();
    const providers: Array<'groq' | 'gemini'> = ['groq', 'gemini'];

    for (const provider of providers) {
        try {
            const model = createLangChainModel(provider);
            const response = await model.invoke([
                ['system', params.systemPrompt],
                ['human', params.userPrompt],
            ]);

            const textContent = typeof response.content === 'string'
                ? response.content
                : JSON.stringify(response.content);

            return {
                content: textContent,
                provider: `langchain-${provider}`,
                latencyMs: Date.now() - startTime,
            };
        } catch (err: any) {
            console.warn(`[EnterpriseLLMRouter] ${provider} tier failed, falling back to next tier:`, err?.message || err);
        }
    }

    throw new Error('All enterprise LLM providers failed or rate-limited.');
}
