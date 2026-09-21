import { test, expect } from '@playwright/test'
import { createGuardedRealtimeDecode } from '../src/lib/realtime-decode'

test.describe('guarded realtime decode', () => {
    test('passes a well-formed frame through to the callback', () => {
        const parse = (raw: unknown) => JSON.parse(raw as string)
        const dropped: unknown[] = []
        const decode = createGuardedRealtimeDecode(parse, (error) => dropped.push(error))

        let delivered: unknown = null
        decode('{"event":"phx_reply","ref":"1"}', (message) => {
            delivered = message
        })

        expect(delivered).toEqual({ event: 'phx_reply', ref: '1' })
        expect(dropped).toHaveLength(0)
    })

    test('drops a truncated frame instead of throwing', () => {
        const parse = (raw: unknown) => JSON.parse(raw as string)
        const dropped: unknown[] = []
        const decode = createGuardedRealtimeDecode(parse, (error) => dropped.push(error))

        let called = false
        expect(() => {
            decode('{"event":"phx_reply","payload":"unterminated', () => {
                called = true
            })
        }).not.toThrow()

        expect(called).toBe(false)
        expect(dropped).toHaveLength(1)
        expect(dropped[0]).toBeInstanceOf(SyntaxError)
    })

    test('counts each dropped frame so recovery stays visible', () => {
        const parse = () => {
            throw new SyntaxError('Unterminated string')
        }
        let count = 0
        const decode = createGuardedRealtimeDecode(parse, () => {
            count += 1
        })

        decode('bad-1', () => {})
        decode('bad-2', () => {})

        expect(count).toBe(2)
    })

    test('does not swallow a throw from the message callback', () => {
        const parse = (raw: unknown) => JSON.parse(raw as string)
        const dropped: unknown[] = []
        const decode = createGuardedRealtimeDecode(parse, (error) => dropped.push(error))

        expect(() => {
            decode('{"ok":true}', () => {
                throw new Error('downstream handler failure')
            })
        }).toThrow('downstream handler failure')

        expect(dropped).toHaveLength(0)
    })
})
