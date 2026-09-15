import { describe, expect, it } from 'vitest'
import { executeToolCall, resolveToolName } from './execute'

describe('daily_reflection_prompt', () => {
    it('resolves tool aliases', () => {
        expect(resolveToolName('daily_reflection')).toBe('daily_reflection_prompt')
        expect(resolveToolName('reflection_prompt')).toBe('daily_reflection_prompt')
    })

    it('generates a prompt without saving to notebook', async () => {
        const res = await executeToolCall({
            id: 'call-1',
            name: 'daily_reflection_prompt',
            argumentsJson: JSON.stringify({ theme: 'stoic', focus_topic: 'patience' }),
        })
        expect(res.ok).toBe(true)
        const parsed = JSON.parse(res.result)
        expect(parsed.ok).toBe(true)
        expect(parsed.saved_to_notebook).toBe(false)
    })

    it('generates a prompt and creates a notebook when save_to_notebook is true and no host notebook exists', async () => {
        const res = await executeToolCall({
            id: 'call-2',
            name: 'daily_reflection_prompt',
            argumentsJson: JSON.stringify({ theme: 'mindfulness', save_to_notebook: true }),
        })
        expect(res.ok).toBe(true)
        expect(res.action?.type).toBe('create_notebook')
        expect(res.action?.payload.title).toContain('Daily Reflection (Mindfulness)')
    })

    it('generates a prompt and inserts a block when save_to_notebook is true and notebook_id is provided', async () => {
        const res = await executeToolCall({
            id: 'call-3',
            name: 'daily_reflection_prompt',
            argumentsJson: JSON.stringify({ theme: 'existentialist', save_to_notebook: true, notebook_id: 'nb-123' }),
        })
        expect(res.ok).toBe(true)
        expect(res.action?.type).toBe('insert_notebook_block')
        expect(res.action?.payload.notebookId).toBe('nb-123')
    })
})
