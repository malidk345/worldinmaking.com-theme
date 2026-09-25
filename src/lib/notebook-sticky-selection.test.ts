import { afterEach, describe, expect, it } from 'vitest'
import {
    clearStickyNotebookSelection,
    peekStickyNotebookSelection,
    peekStickyNotebookSelectionFor,
    rememberStickyNotebookSelection,
    resolveNotebookSelection,
    syncStickyNotebookSelection,
} from './notebook-chat-bind'

function mount() {
    document.body.innerHTML = `
      <div class="notebook-app-scope" id="nb"><div class="MarkdownNotebook"><p id="p">Technology frames the world today.</p></div></div>
      <div id="chat"><p id="c">Chat text here</p></div>`
    return {
        nb: document.getElementById('nb')!,
        p: document.getElementById('p')!.firstChild!,
        c: document.getElementById('c')!.firstChild!,
    }
}
function select(node: Node, start: number, end: number) {
    const range = document.createRange()
    range.setStart(node, start)
    range.setEnd(node, end)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)
}

afterEach(() => {
    clearStickyNotebookSelection()
    window.getSelection()?.removeAllRanges()
    document.body.innerHTML = ''
})

describe('sticky notebook selection', () => {
    it('remembers a selection, keeps it when focus moves to the chat, clears it on collapse in the notebook', () => {
        const { nb, p, c } = mount()
        select(p, 0, 10)
        expect(syncStickyNotebookSelection('nb-1', nb)).toBe('remember')
        expect(peekStickyNotebookSelection()).toBe('Technology')

        select(c, 0, 4) // user clicks into the chat
        expect(syncStickyNotebookSelection('nb-1', nb)).toBe('keep')
        expect(peekStickyNotebookSelection()).toBe('Technology')

        select(p, 3, 3) // collapsed caret inside the notebook
        expect(syncStickyNotebookSelection('nb-1', nb)).toBe('clear')
        expect(peekStickyNotebookSelection()).toBe('')
    })

    it('is scoped to the notebook it came from', () => {
        rememberStickyNotebookSelection('some phrase', 'nb-1')
        expect(peekStickyNotebookSelectionFor('nb-1')).toBe('some phrase')
        expect(peekStickyNotebookSelectionFor('nb-2')).toBe('')
    })

    it('the live selection wins over the sticky one', () => {
        const { p } = mount()
        rememberStickyNotebookSelection('old stale phrase', 'nb-1')
        select(p, 11, 17)
        expect(resolveNotebookSelection('nb-1')).toEqual({ text: 'frames', sticky: false })
        window.getSelection()!.removeAllRanges()
        expect(resolveNotebookSelection('nb-1')).toEqual({ text: 'old stale phrase', sticky: true })
    })
})
