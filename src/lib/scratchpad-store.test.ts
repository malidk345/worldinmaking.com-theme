// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function memoryStorage(): Storage {
    const map = new Map<string, string>()
    return {
        get length() {
            return map.size
        },
        clear() {
            map.clear()
        },
        getItem(key: string) {
            return map.has(key) ? (map.get(key) as string) : null
        },
        key() {
            return null
        },
        removeItem(key: string) {
            map.delete(key)
        },
        setItem(key: string, value: string) {
            map.set(key, value)
        },
    }
}

describe('scratchpad-store owner namespace', () => {
    beforeEach(() => {
        vi.resetModules()
    })
    afterEach(() => {
        delete (globalThis as { window?: unknown }).window
    })

    it('reloads empty pad for a new owner and does not leak prior content', async () => {
        const localStorage = memoryStorage()
        const listeners = new Map<string, Set<(event: Event) => void>>()
        ;(globalThis as { window?: unknown }).window = {
            localStorage,
            sessionStorage: memoryStorage(),
            dispatchEvent(event: Event) {
                listeners.get(event.type)?.forEach((fn) => fn(event))
                return true
            },
            addEventListener(type: string, fn: (event: Event) => void) {
                if (!listeners.has(type)) listeners.set(type, new Set())
                listeners.get(type)!.add(fn)
            },
            removeEventListener(type: string, fn: (event: Event) => void) {
                listeners.get(type)?.delete(fn)
            },
        }
        localStorage.setItem('wim_auth_user_id', 'user-aaaa-bbbb-cccc-ddddeeee')
        const { ScratchpadStore } = await import('./scratchpad-store')
        const { WIM_IDENTITY_EVENT } = await import('./wim-identity')
        ScratchpadStore.addMemory({ fact: 'Alice secret memory', category: 'test' })
        expect(ScratchpadStore.getState().memories.some((m) => m.fact.includes('Alice'))).toBe(true)
        expect(localStorage.getItem('wim_os_scratchpad_v3')).toBeNull()

        localStorage.removeItem('wim_auth_user_id')
        window.dispatchEvent(new Event(WIM_IDENTITY_EVENT))
        expect(ScratchpadStore.getState().memories).toEqual([])
    })
})
