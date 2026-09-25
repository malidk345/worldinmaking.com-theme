import { afterEach, describe, expect, it, vi } from 'vitest'
import { dispatchNotebookOsEventWithAck, notebookAckErrorMessage, setNotebookOsListenerCountForTests } from './notebook-os-dispatch'
import { claimNotebookEvent, removeNotebookEditor, setNotebookEditorTarget } from './notebook-os-claim'

type Detail = Record<string, unknown> & { requestId?: string }
const ack = (detail: Record<string, unknown>) => window.dispatchEvent(new CustomEvent('wimNotebookAck', { detail }))

afterEach(() => {
    setNotebookOsListenerCountForTests(0)
    vi.useRealTimers()
})

describe('dispatchNotebookOsEventWithAck (real confirmation, not "dispatched")', () => {
    it('resolves ok only when the notebook acks our request', async () => {
        setNotebookOsListenerCountForTests(1)
        const onEvent = (e: Event) => {
            const d = (e as CustomEvent<Detail>).detail
            ack({ notebookId: 'other', requestId: 'someone-else' }) // unrelated ack is ignored
            ack({ notebookId: 'nb-1', requestId: d.requestId })
        }
        window.addEventListener('wimNotebookInsertText', onEvent)
        const res = await dispatchNotebookOsEventWithAck('wimNotebookInsertText', { text: 'x', notebookId: 'nb-1' })
        window.removeEventListener('wimNotebookInsertText', onEvent)
        expect(res).toEqual({ ok: true, notebookId: 'nb-1' })
    })

    it('surfaces the notebook nack reason (e.g. duplicate, selection not found)', async () => {
        setNotebookOsListenerCountForTests(1)
        const onEvent = (e: Event) => ack({ ok: false, error: 'selection_not_found', requestId: (e as CustomEvent<Detail>).detail.requestId })
        window.addEventListener('wimNotebookAddFootnote', onEvent)
        const res = await dispatchNotebookOsEventWithAck('wimNotebookAddFootnote', { text: 'ref', notebookId: 'nb-1' })
        window.removeEventListener('wimNotebookAddFootnote', onEvent)
        expect(res).toEqual({ ok: false, error: 'selection_not_found' })
        expect(notebookAckErrorMessage('duplicate_source')).toBe('Already in this notebook')
    })

    it('legacy acks without requestId: success must match the target id', async () => {
        setNotebookOsListenerCountForTests(1)
        const onEvent = () => {
            ack({ notebookId: 'wrong' })
            ack({ notebookId: 'nb-1' })
        }
        window.addEventListener('wimNotebookInsertText', onEvent)
        const res = await dispatchNotebookOsEventWithAck('wimNotebookInsertText', { text: 'x', notebookId: 'nb-1' })
        window.removeEventListener('wimNotebookInsertText', onEvent)
        expect(res).toEqual({ ok: true, notebookId: 'nb-1' })
    })

    it('times out honestly when the notebook never confirms', async () => {
        vi.useFakeTimers()
        setNotebookOsListenerCountForTests(1)
        const pending = dispatchNotebookOsEventWithAck('wimNotebookInsertText', { text: 'x', notebookId: 'nb-1' }, { ackTimeoutMs: 5000 })
        await vi.advanceTimersByTimeAsync(5001)
        await expect(pending).resolves.toEqual({ ok: false, error: 'timeout' })
    })

    it('opens the editor once and fails closed when no listener ever mounts', async () => {
        vi.useFakeTimers()
        const open = vi.fn()
        const pending = dispatchNotebookOsEventWithAck('wimNotebookInsertText', { text: 'x' }, { notebookId: 'nb-1', open, maxWaitMs: 300 })
        await vi.advanceTimersByTimeAsync(400)
        await expect(pending).resolves.toEqual({ ok: false, error: 'not_reachable' })
        expect(open).toHaveBeenCalledTimes(1)
    })
})

describe('claimNotebookEvent (one notebook window handles each event)', () => {
    afterEach(() => {
        removeNotebookEditor('A')
        removeNotebookEditor('B')
    })

    it('the window editing the target wins; others skip', () => {
        setNotebookEditorTarget('A', 'nb-a')
        setNotebookEditorTarget('B', 'nb-b')
        const detail: Record<string, unknown> = { notebookId: 'nb-b' }
        expect(claimNotebookEvent(detail, 'A')).toBe(false)
        expect(claimNotebookEvent(detail, 'B')).toBe(true)
        expect(claimNotebookEvent(detail, 'A')).toBe(false)
    })

    it('when nobody edits the target, the first instance claims it', () => {
        setNotebookEditorTarget('A', null)
        setNotebookEditorTarget('B', 'nb-b')
        const detail: Record<string, unknown> = { notebookId: 'nb-z' }
        expect(claimNotebookEvent(detail, 'A')).toBe(true)
        expect(claimNotebookEvent(detail, 'B')).toBe(false)
        expect(Object.keys(detail)).toEqual(['notebookId']) // claim is not serialized
    })
})
