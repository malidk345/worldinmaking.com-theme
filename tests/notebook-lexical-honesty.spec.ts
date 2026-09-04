import { test, expect } from '@playwright/test'
import { getAskAiSystemPrompt } from '../src/lib/bots/ask-ai'
import { TOOL_PROTOCOL } from '../src/lib/bots/tools/spec'
import { buildNotebookRAGContext, searchKnowledgeWorkspace } from '../src/lib/bots/notebook-rag'
import { searchLexicalDocuments, searchSemanticDocuments } from '../src/lib/semantic-search'
import { executeReadDocument } from '../src/lib/bots/tools/read-document'

test.describe('Honest notebook lexical retrieval', () => {
    test('Ask AI prompt and tool protocol reject embedding/vector RAG claims', () => {
        const prompt = getAskAiSystemPrompt({ voiceName: 'Nietzsche' })
        expect(prompt).toContain('not embedding or vector RAG')
        expect(prompt.toLowerCase()).not.toContain('vector database')
        expect(TOOL_PROTOCOL).toContain('no embedding/vector RAG')
        expect(TOOL_PROTOCOL).toContain('do not invent notebook citations')
    })

    test('notebook-rag fails closed and labels lexical matches honestly', () => {
        const notebooks = [
            {
                id: 'nb-1',
                title: 'Garden notes',
                content: '# Soil\n\nClay drains poorly.\n\n# Tools\n\nUse a steel rake.',
            },
        ]
        const miss = buildNotebookRAGContext('quantum cryptography lattice', notebooks)
        expect(miss).toContain('No matching passages found')
        expect(miss.toLowerCase()).toContain('not embedding')
        expect(miss).not.toContain('Verified Workspace & Document Context (RAG)')

        const hit = searchKnowledgeWorkspace('steel rake', { notebooks }, 3)
        expect(hit.chunks.length).toBeGreaterThan(0)
        expect(hit.contextText).toContain('Lexical notebook/document matches')
        expect(hit.contextText).not.toContain('(RAG):')
        expect(hit.contextText.toLowerCase()).toContain('not embedding')
    })

    test('searchLexicalDocuments is the real mechanism; semantic alias delegates', () => {
        const docs = [
            { id: '1', title: 'Notebook A', content: 'alpha beta gamma', type: 'notebook' as const },
            { id: '2', title: 'Other', content: 'unrelated text', type: 'post' as const },
        ]
        const hits = searchLexicalDocuments('alpha beta', docs, 5)
        expect(hits[0]?.objectID).toBe('1')
        expect(searchSemanticDocuments('alpha beta', docs, 5).map((h) => h.objectID)).toEqual(
            hits.map((h) => h.objectID)
        )
    })

    test('read_document query filter fails closed instead of returning the whole doc', async () => {
        const result = await executeReadDocument(
            { name: 'Garden notes', query: 'quantum-cryptography-xyz' },
            {
                notebooks: [
                    {
                        id: 'nb-1',
                        title: 'Garden notes',
                        content: 'Clay drains poorly.\n\nUse a steel rake in spring.',
                    },
                ],
            }
        )
        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.error).toContain('No passages matching')
            expect(result.error.toLowerCase()).toContain('not embedding')
        }

        const hit = await executeReadDocument(
            { name: 'Garden notes', query: 'steel rake' },
            {
                notebooks: [
                    {
                        id: 'nb-1',
                        title: 'Garden notes',
                        content: 'Clay drains poorly.\n\nUse a steel rake in spring.',
                    },
                ],
            }
        )
        expect(hit.ok).toBe(true)
        if (hit.ok) {
            expect(hit.text).toContain('steel rake')
            expect(hit.text).not.toContain('Clay drains poorly')
        }
    })
})
