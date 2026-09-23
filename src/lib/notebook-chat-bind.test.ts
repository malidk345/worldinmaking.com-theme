// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
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
})
