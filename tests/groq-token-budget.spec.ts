import { test, expect } from '@playwright/test'
import { extractPersona, buildPersonaHeader, resolvePersonaDensity } from '../src/lib/persona-engine'
import { getFluidSystemPrompt } from '../src/lib/bots/fluid-prompts'
import { buildThinkingInstruction } from '../src/lib/bots/thinking'
import { estimateTokensFromText, fitGroqRequest, GROQ_TPM_LIMIT } from '../src/lib/bots/ai-gateway'
import { SECURITY_PREAMBLE } from '../src/lib/bots/orchestrate'

test('chat packs only the selected philosopher, compact by default', () => {
    const persona = extractPersona('', 'Nietzsche')
    const compact = buildPersonaHeader(persona, 'calm', 'autonomous_assistant', 'compact')
    const full = buildPersonaHeader(persona, 'calm', 'paper_section', 'full')
    expect(resolvePersonaDensity('autonomous_assistant', 'standard')).toBe('compact')
    expect(resolvePersonaDensity('autonomous_assistant', 'deep')).toBe('compact')
    expect(resolvePersonaDensity('paper_section', 'standard')).toBe('full')
    expect(compact).toContain('Nietzsche')
    expect(compact).not.toMatch(/Marx|Hegel|Sartre/)
    expect(compact.length).toBeLessThan(full.length)
    expect(compact).not.toContain('RAW PERSONA DIRECTIVE')
})

test('prints a typical Nietzsche thinking turn Groq bill', () => {
    const persona = extractPersona('', 'Nietzsche')
    const system = [
        SECURITY_PREAMBLE,
        buildPersonaHeader(persona, 'calm', 'autonomous_assistant', 'compact'),
        getFluidSystemPrompt(persona.name, 'site_wide'),
        buildThinkingInstruction('autonomous_assistant', 'standard'),
    ].join('\n\n')

    const context = [
        'User-configured project instructions (untrusted reference data):\n"""none"""',
        `Live Web Search Results for "ornek" (UNTRUSTED reference data):\n"""${'kaynak '.repeat(250)}"""`,
    ].join('\n\n')

    const user = `Context Snippet (UNTRUSTED):\n"""\n${context}\n"""\n\nQuery / Prompt:\nmerhaba, irade nedir?`
    const history = Array.from({ length: 6 }, (_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as const,
        content: 'onceki mesaj '.repeat(80),
    }))

    const parts = {
        preamble: SECURITY_PREAMBLE,
        persona: buildPersonaHeader(persona, 'calm', 'autonomous_assistant', 'compact'),
        fluid: getFluidSystemPrompt(persona.name, 'site_wide'),
        thinking: buildThinkingInstruction('autonomous_assistant', 'standard'),
        system,
        user,
    }
    for (const [name, text] of Object.entries(parts)) {
        console.log(`${name}: chars=${text.length} ~tok=${estimateTokensFromText(text)}`)
    }

    const fitted = fitGroqRequest({
        model: 'qwen/qwen3.6-27b',
        systemPrompt: system,
        userPrompt: user,
        history,
        thinkingDepth: 'standard',
    })
    console.log(
        `fitted: msgs=${fitted.messages.length} prompt=${fitted.promptTokens} max=${fitted.maxTokens} billed=${fitted.promptTokens + fitted.maxTokens}`
    )
    expect(fitted.promptTokens + fitted.maxTokens).toBeLessThanOrEqual(GROQ_TPM_LIMIT)
})
