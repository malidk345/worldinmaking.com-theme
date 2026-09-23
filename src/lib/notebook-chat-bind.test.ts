// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
    bindNotebookChat,
    clearNotebookChatBind,
    readNotebookChatBind,
    withNotebookBind,
} from './notebook-chat-bind'

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

describe('notebook chat bind persistence', () => {
    afterEach(() => {
        delete (globalThis as { window?: unknown }).window
    })

    it('keeps the bind for a cold open after sessionStorage is cleared', () => {
        const sessionStorage = memoryStorage()
        const localStorage = memoryStorage()
        ;(globalThis as { window?: unknown }).window = {
            sessionStorage,
            localStorage,
            dispatchEvent() {},
            addEventListener() {},
            removeEventListener() {},
        }
        bindNotebookChat({ notebookId: 'nb-1', title: 'Field notes' })
        sessionStorage.clear()
        expect(readNotebookChatBind()).toEqual({ notebookId: 'nb-1', title: 'Field notes' })
        clearNotebookChatBind()
        expect(readNotebookChatBind()).toBeNull()
        expect(localStorage.getItem('wim_chat_notebook_bind')).toBeNull()
    })

    it('stamps a missing notebook id and leaves an existing one', () => {
        expect(withNotebookBind({ id: 'c1' }, 'nb-9')).toEqual({ id: 'c1', notebookId: 'nb-9' })
        expect(withNotebookBind({ id: 'c1', notebookId: 'nb-1' }, 'nb-9')).toEqual({
            id: 'c1',
            notebookId: 'nb-1',
        })
        expect(withNotebookBind({ id: 'c1' }, '  ')).toEqual({ id: 'c1' })
    })

    it('clears bind when active chat owner identity changes', async () => {
        vi.resetModules()
        const sessionStorage = memoryStorage()
        const localStorage = memoryStorage()
        const listeners = new Map<string, Set<(event: Event) => void>>()
        ;(globalThis as { window?: unknown }).window = {
            sessionStorage,
            localStorage,
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
        const bindMod = await import('./notebook-chat-bind')
        const { WIM_IDENTITY_EVENT } = await import('./wim-identity')
        bindMod.bindNotebookChat({ notebookId: 'nb-acct', title: 'Account notes' })
        expect(bindMod.readNotebookChatBind()?.notebookId).toBe('nb-acct')

        // Logout: auth id gone → device owner key (different) → bind must clear.
        localStorage.removeItem('wim_auth_user_id')
        window.dispatchEvent(new Event(WIM_IDENTITY_EVENT))
        expect(bindMod.readNotebookChatBind()).toBeNull()
        expect(localStorage.getItem('wim_chat_notebook_bind')).toBeNull()
    })

    it('keeps bind on same-owner identity event (token refresh)', async () => {
        vi.resetModules()
        const sessionStorage = memoryStorage()
        const localStorage = memoryStorage()
        const listeners = new Map<string, Set<(event: Event) => void>>()
        ;(globalThis as { window?: unknown }).window = {
            sessionStorage,
            localStorage,
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
        const bindMod = await import('./notebook-chat-bind')
        const { WIM_IDENTITY_EVENT } = await import('./wim-identity')
        bindMod.bindNotebookChat({ notebookId: 'nb-keep', title: 'Keep' })
        window.dispatchEvent(new Event(WIM_IDENTITY_EVENT))
        expect(bindMod.readNotebookChatBind()).toEqual({ notebookId: 'nb-keep', title: 'Keep' })
    })

})
