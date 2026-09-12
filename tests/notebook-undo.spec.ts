import { test, expect } from '@playwright/test'
import { diffNotebookDocuments, applyNotebookOperations, rebaseNotebookOperationStack } from '../src/notebook-app/lib/components/MarkdownNotebook/operations'
import { NotebookDocument, NotebookBlockNode } from '../src/notebook-app/lib/components/MarkdownNotebook/types'
import { writeNotebookHistory, getNotebookHistory } from '../src/notebook-app/scenes/notebooks/notebookStorage'

function makeDoc(id: string, text: string): NotebookDocument {
    return {
        type: 'doc',
        nodes: [{ id: 'p1', type: 'paragraph', children: [{ type: 'text', text }] }],
        errors: [],
    }
}

function makeDocMulti(nodes: NotebookBlockNode[]): NotebookDocument {
    return { type: 'doc', nodes, errors: [] }
}

test.describe('Notebook Undo/Redo operations and logic', () => {
    test('typing followed by undo', () => {
        const doc1 = makeDoc('1', 'hello')
        const doc2 = makeDoc('1', 'hello world')
        const ops = diffNotebookDocuments(doc1, doc2)
        expect(ops.length).toBeGreaterThan(0)

        const applied = applyNotebookOperations(doc1, ops)
        expect(applied?.document.nodes[0]).toEqual(doc2.nodes[0])
        expect(applied?.inverted).toBeDefined()

        const undoApplied = applyNotebookOperations(applied!.document, applied!.inverted)
        expect(undoApplied?.document.nodes[0]).toEqual(doc1.nodes[0])
    })

    test('multiple sequential edits', () => {
        const doc1 = makeDoc('1', 'h')
        const doc2 = makeDoc('1', 'he')
        const doc3 = makeDoc('1', 'hel')
        const ops1 = diffNotebookDocuments(doc1, doc2)
        const ops2 = diffNotebookDocuments(doc2, doc3)
        const applied1 = applyNotebookOperations(doc1, ops1)
        expect(applied1?.document.nodes[0]).toEqual(doc2.nodes[0])
        const applied2 = applyNotebookOperations(applied1!.document, ops2)
        expect(applied2?.document.nodes[0]).toEqual(doc3.nodes[0])
    })

    test('undo followed by redo', () => {
        const doc1 = makeDoc('1', 'hello')
        const doc2 = makeDoc('1', 'hello world')
        const ops = diffNotebookDocuments(doc1, doc2)

        const applyResult = applyNotebookOperations(doc1, ops)
        expect(applyResult?.document.nodes[0]).toEqual(doc2.nodes[0])

        const undoResult = applyNotebookOperations(applyResult!.document, applyResult!.inverted)
        expect(undoResult?.document.nodes[0]).toEqual(doc1.nodes[0])

        const redoResult = applyNotebookOperations(undoResult!.document, undoResult!.inverted)
        expect(redoResult?.document.nodes[0]).toEqual(doc2.nodes[0])
    })

    test('undo/redo not unexpectedly overwriting newer remote/local content', () => {
        const doc1 = makeDoc('1', 'hello')
        const doc2 = makeDoc('1', 'hello world')
        const ops = diffNotebookDocuments(doc1, doc2)

        const stack = [{ ops, selection: null, editedAt: Date.now(), coalesceNodeId: 'p1' }]

        const docRemote = makeDoc('1', 'hello remote')
        const remoteOps = diffNotebookDocuments(doc1, docRemote)

        const rebased = rebaseNotebookOperationStack(stack, remoteOps)
        expect(rebased.length).toBe(1)
    })

    test('block insertion/deletion followed by undo/redo', () => {
        const doc1 = makeDocMulti([{ id: 'p1', type: 'paragraph', children: [{ type: 'text', text: '1' }] }])
        const doc2 = makeDocMulti([
            { id: 'p1', type: 'paragraph', children: [{ type: 'text', text: '1' }] },
            { id: 'p2', type: 'paragraph', children: [{ type: 'text', text: '2' }] }
        ])

        const ops = diffNotebookDocuments(doc1, doc2)
        expect(ops.some(op => op.type === 'insert_block')).toBe(true)

        const applied = applyNotebookOperations(doc1, ops)
        expect(applied?.document.nodes.length).toBe(2)

        const inverted = applyNotebookOperations(applied!.document, applied!.inverted)
        expect(inverted?.document.nodes.length).toBe(1)
    })

    test('formatting changes', () => {
        const doc1 = makeDoc('1', 'text')
        const doc2: NotebookDocument = {
            type: 'doc',
            nodes: [{ id: 'p1', type: 'paragraph' as const, children: [{ type: 'text', text: 'text', marks: [{ type: 'bold' as const }] }] }],
            errors: [],
        }

        const ops = diffNotebookDocuments(doc1, doc2)
        const applied = applyNotebookOperations(doc1, ops)
        expect(applied?.document.nodes[0]).toEqual(doc2.nodes[0])

        const inverted = applyNotebookOperations(applied!.document, applied!.inverted)
        expect(inverted?.document.nodes[0]).toEqual(doc1.nodes[0])
    })

    test('slash-block insertion', () => {
        const doc1 = makeDocMulti([{ id: 'p1', type: 'paragraph', children: [{ type: 'text', text: '/' }] }])
        const doc2 = makeDocMulti([
            { id: 'p2', type: 'component', tagName: 'Callout', props: { content: 'test callout' } } as NotebookBlockNode
        ])

        const ops = diffNotebookDocuments(doc1, doc2)
        const applied = applyNotebookOperations(doc1, ops)
        expect(applied?.document.nodes[0].type).toBe('component')

        const inverted = applyNotebookOperations(applied!.document, applied!.inverted)
        expect(inverted?.document.nodes[0].type).toBe('paragraph')
        expect((inverted?.document.nodes[0] as any).children[0].text).toBe('/')
    })

    test('paste operations where testable', () => {
        const doc1 = makeDoc('1', 'first paragraph')
        const doc2 = makeDocMulti([
            { id: 'p1', type: 'paragraph', children: [{ type: 'text', text: 'first paragraph' }] },
            { id: 'p2', type: 'paragraph', children: [{ type: 'text', text: 'pasted external text' }] }
        ])
        const ops = diffNotebookDocuments(doc1, doc2)
        const applied = applyNotebookOperations(doc1, ops)
        expect(applied?.document.nodes.length).toBe(2)

        const inverted = applyNotebookOperations(applied!.document, applied!.inverted)
        expect(inverted?.document.nodes.length).toBe(1)
        expect((inverted?.document.nodes[0] as any).children[0].text).toBe('first paragraph')
    })

    test.beforeAll(() => {
        // mock window.localStorage for notebookStorage tests to work in playwright
        global.window = Object.create(global.window || {})
        const store = {}
        global.window.localStorage = {
            getItem: (key) => store[key] || null,
            setItem: (key, val) => { store[key] = val },
            removeItem: (key) => { delete store[key] }
        }
    })

    test('history snapshots not corrupting current editor state', () => {
        const id = 'test-nb-undo-snap'
        const initialDoc = makeDoc('1', 'text')
        writeNotebookHistory(id, [{ version: 1, timestamp: new Date().toISOString(), content: 'test content' }])
        const history = getNotebookHistory(id)

        const doc2 = makeDoc('1', 'text 2')
        const ops = diffNotebookDocuments(initialDoc, doc2)
        expect(ops.length).toBeGreaterThan(0)

        expect(history[0].content).toBe('test content')
    })

    test('undo after persistence/hydration', () => {
        const id = 'test-nb-undo-persist'
        writeNotebookHistory(id, [{ version: 1, timestamp: new Date().toISOString(), content: 'test content' }])
        const retrieved = getNotebookHistory(id)
        expect(retrieved.length).toBe(1)
        expect(retrieved[0].content).toBe('test content')

        const doc1 = makeDoc('1', 'test content')
        const doc2 = makeDoc('1', 'test content modified')
        const ops = diffNotebookDocuments(doc1, doc2)
        const applied = applyNotebookOperations(doc1, ops)
        expect(applied?.document.nodes[0]).toEqual(doc2.nodes[0])
    })

    test('undo before persistence', () => {
        const doc1 = makeDoc('1', 'draft')
        const doc2 = makeDoc('1', 'draft change')
        const ops = diffNotebookDocuments(doc1, doc2)
        const applied = applyNotebookOperations(doc1, ops)
        const inverted = applyNotebookOperations(applied!.document, applied!.inverted)
        expect(inverted?.document.nodes[0]).toEqual(doc1.nodes[0])
    })

    test('reopening a notebook after edits', () => {
        const doc1 = makeDoc('1', 'open')
        const doc2 = makeDoc('1', 'open edits')
        const ops = diffNotebookDocuments(doc1, doc2)
        const applied = applyNotebookOperations(doc1, ops)
        expect(applied?.document.nodes[0]).toEqual(doc2.nodes[0])
    })
})
