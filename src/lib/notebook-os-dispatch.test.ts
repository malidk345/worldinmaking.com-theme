/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
    dispatchNotebookOsEvent,
    isNotebookOsListenerAlive,
    setNotebookOsListenerCountForTests,
    WIM_NOTEBOOK_OS_LISTENER_COUNT_KEY,
} from './notebook-os-dispatch'

type Handler = (event: { detail?: unknown }) => void

function installMinimalDom() {
    const listeners = new Map<string, Set<Handler>>()
    const bodyChildren: { getAttribute: (name: string) => string | null }[] = []

    const win: any = {
        [WIM_NOTEBOOK_OS_LISTENER_COUNT_KEY]: 0,
        setTimeout: globalThis.setTimeout.bind(globalThis),
        clearTimeout: globalThis.clearTimeout.bind(globalThis),
        addEventListener(type: string, handler: Handler) {
            if (!listeners.has(type)) listeners.set(type, new Set())
            listeners.get(type)!.add(handler)
        },
        removeEventListener(type: string, handler: Handler) {
            listeners.get(type)?.delete(handler)
        },
        dispatchEvent(event: { type: string; detail?: unknown }) {
            const set = listeners.get(event.type)
            if (!set) return true
            for (const handler of [...set]) handler(event)
            return true
        },
    }

    const doc: any = {
        body: {
            appendChild(el: any) {
                bodyChildren.push(el)
                return el
            },
            innerHTML: '',
        },
        querySelector(selector: string) {
            if (selector === '[data-notebook-lock="true"]') {
                return (
                    bodyChildren.find((el) => el.getAttribute?.('data-notebook-lock') === 'true') || null
                )
            }
            return null
        },
        createElement(_tag: string) {
            const attrs: Record<string, string> = {}
            return {
                setAttribute(name: string, value: string) {
                    attrs[name] = value
                },
                getAttribute(name: string) {
                    return attrs[name] ?? null
                },
            }
        },
    }

    // reset bodyChildren when innerHTML cleared
    Object.defineProperty(doc.body, 'innerHTML', {
        get() {
            return ''
        },
        set() {
            bodyChildren.length = 0
        },
        configurable: true,
    })

    vi.stubGlobal('window', win)
    vi.stubGlobal('document', doc)
    return { win, doc, listeners, bodyChildren }
}

describe('notebook-os-dispatch', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        installMinimalDom()
        setNotebookOsListenerCountForTests(0)
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.unstubAllGlobals()
    })

    it('reports alive when listener count > 0', () => {
        expect(isNotebookOsListenerAlive()).toBe(false)
        setNotebookOsListenerCountForTests(1)
        expect(isNotebookOsListenerAlive()).toBe(true)
    })

    it('reports alive when data-notebook-lock is present', () => {
        const el = document.createElement('div')
        el.setAttribute('data-notebook-lock', 'true')
        document.body.appendChild(el)
        expect(isNotebookOsListenerAlive()).toBe(true)
    })

    it('dispatches immediately when listener is already alive', async () => {
        setNotebookOsListenerCountForTests(1)
        const handler = vi.fn()
        window.addEventListener('wimNotebookInsertText', handler as any)

        const open = vi.fn()
        const resultPromise = dispatchNotebookOsEvent(
            'wimNotebookInsertText',
            { text: 'hello', notebookId: 'nb-1' },
            { open, maxWaitMs: 1000, retryIntervalMs: 50 }
        )

        await expect(resultPromise).resolves.toBe(true)
        expect(open).not.toHaveBeenCalled()
        expect(handler).toHaveBeenCalledTimes(1)
        expect(handler.mock.calls[0][0].detail).toEqual({ text: 'hello', notebookId: 'nb-1' })
    })

    it('opens then retries until listener mounts, dispatching once', async () => {
        const handler = vi.fn()
        window.addEventListener('wimNotebookPatchText', handler as any)

        const open = vi.fn(() => {
            window.setTimeout(() => setNotebookOsListenerCountForTests(1), 120)
        })

        const resultPromise = dispatchNotebookOsEvent(
            'wimNotebookPatchText',
            { added: 'x', removed: 'y' },
            { open, notebookId: 'nb-2', maxWaitMs: 1000, retryIntervalMs: 50 }
        )

        await vi.advanceTimersByTimeAsync(50)
        expect(handler).not.toHaveBeenCalled()
        expect(open).toHaveBeenCalledTimes(1)

        await vi.advanceTimersByTimeAsync(100)
        await expect(resultPromise).resolves.toBe(true)
        expect(handler).toHaveBeenCalledTimes(1)
        expect(handler.mock.calls[0][0].detail.notebookId).toBe('nb-2')
        expect(handler.mock.calls[0][0].detail.added).toBe('x')
    })

    it('returns false on timeout without dispatching (fail-closed)', async () => {
        const handler = vi.fn()
        window.addEventListener('wimNotebookReplaceSelection', handler as any)
        const open = vi.fn()

        const resultPromise = dispatchNotebookOsEvent(
            'wimNotebookReplaceSelection',
            { text: 'z' },
            { open, maxWaitMs: 200, retryIntervalMs: 50 }
        )

        await vi.advanceTimersByTimeAsync(250)
        await expect(resultPromise).resolves.toBe(false)
        expect(open).toHaveBeenCalledTimes(1)
        expect(handler).not.toHaveBeenCalled()
    })
})
