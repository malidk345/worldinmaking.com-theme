import { describe, expect, it } from 'vitest'
import { systemTextFromMessages } from './system-channel'

describe('systemTextFromMessages', () => {
    it('uses the system turn the host already extended, once', () => {
        const text = systemTextFromMessages(
            [
                { role: 'system', content: 'BASE\n\n<plan_board>\nnext\n</plan_board>' },
                { role: 'user', content: 'write the next section' },
            ],
            'BASE'
        )
        expect(text).toContain('<plan_board>')
        expect(text.split('BASE').length - 1).toBe(1)
    })

    it('falls back when the messages have no system turn', () => {
        expect(systemTextFromMessages([{ role: 'user', content: 'hi' }], 'BASE')).toBe('BASE')
    })
})
