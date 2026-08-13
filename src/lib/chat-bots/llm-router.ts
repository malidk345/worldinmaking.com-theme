/**
 * Enterprise Multi-Tier LLM Fallback Router — WorldInMaking.com
 *
 * Implements a high-availability fallback router across multiple AI providers:
 *   Tier 1: Groq (Llama 3.3 70B) — ultra-fast inference
 *   Tier 2: Google Gemini (Gemini 2.0 Flash) — deep reasoning
 *   Tier 3: Local Ollama / vLLM — fallback self-hosted models
 */

import { generateWithGateway } from '../bots/ai-gateway';
import type { EnvStore } from '../bots/runtime-env';
import type { TaskType } from '../persona-engine';

export interface LLMCallResult {
    content: string;
    provider: string;
    latencyMs: number;
}

export async function executeEnterpriseLLMCall(params: {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    taskType?: TaskType;
    botName?: string;
    env?: EnvStore;
}): Promise<LLMCallResult> {
    const startTime = Date.now();
    const result = await generateWithGateway({
        systemPrompt: params.systemPrompt,
        userPrompt: params.userPrompt,
        temperature: params.temperature,
        taskType: params.taskType,
        botName: params.botName,
        env: params.env,
    });

    if (!result.ok) {
        throw new Error(result.error);
    }

    return {
        content: result.text,
        provider: result.provider,
        latencyMs: Date.now() - startTime,
    };
}
