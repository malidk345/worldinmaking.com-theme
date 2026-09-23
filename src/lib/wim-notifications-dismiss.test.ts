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
        key(index: number) {
            return Array.from(map.keys())[index] ?? null
        },
        removeItem(key: string) {
            map.delete(key)
        },
        setItem(key: string, value: string) {
            map.set(key, value)
        },
    }
}

describe('dismissed notebook notes owner namespace', () => {
    beforeEach(() => {
        vi.resetModules()
    })
    afterEach(() => {
        delete (globalThis as { window?: unknown }).window
    })

    it('uses owner-namespaced key and ignores global dismiss set when signed in', async () => {
        const localStorage = memoryStorage()
        ;(globalThis as { window?: unknown }).window = {
            localStorage,
            sessionStorage: memoryStorage(),
            dispatchEvent() {
                return true
            },
            addEventListener() {},
            removeEventListener() {},
        }
        localStorage.setItem('wim_dismissed_notebook_notes', JSON.stringify(['invite_leak_from_alice']))
        localStorage.setItem('wim_auth_user_id', 'user-bbbb-cccc-dddd-eeeeffff')
        // Import after window — then call dismiss which writes namespaced.
        // supabase import may fail in node; stub minimal module path by mocking.
        vi.doMock('lib/supabase', () => ({
            supabase: {
                from() {
                    return {
                        select() {
                            return this
                        },
                        update() {
                            return this
                        },
                        eq() {
                            return this
                        },
                        is() {
                            return this
                        },
                        order() {
                            return this
                        },
                        limit() {
                            return Promise.resolve({ data: [], error: null })
                        },
                        maybeSingle() {
                            return Promise.resolve({ data: null, error: null })
                        },
                    }
                },
                auth: {
                    getSession: async () => ({ data: { session: null } }),
                    getUser: async () => ({ data: { user: null } }),
                },
            },
        }))
        const mod = await import('./wim-notifications')
        expect(mod.getDismissedNotebookNotesStorageKey()).toContain('user-bbbb-cccc-dddd-eeeeffff')
        // dismiss invite_* path only touches localStorage (no supabase write for invite_)
        const result = await mod.dismissUserNotification('invite_99')
        expect(result.ok).toBe(true)
        const ns = localStorage.getItem(mod.getDismissedNotebookNotesStorageKey())
        expect(ns).toContain('invite_99')
        expect(ns).not.toContain('invite_leak_from_alice')
        // Global leftover must not be read for signed-in (would suppress Bob's invites).
        expect(localStorage.getItem('wim_dismissed_notebook_notes')).toContain('invite_leak_from_alice')
    })
})
