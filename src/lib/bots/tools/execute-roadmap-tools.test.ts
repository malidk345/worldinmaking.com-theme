import { describe, expect, it } from 'vitest'
import { executeToolCall, resolveToolName } from './execute'
import type { HostSnapshot } from './host'

describe('Roadmap AI Tools Execution', () => {
    describe('resolveToolName aliases', () => {
        it('resolves tool name aliases for all roadmap tools', () => {
            expect(resolveToolName('cross_examine')).toBe('cross_examine_argument')
            expect(resolveToolName('socratic_cross_examine')).toBe('cross_examine_argument')
            expect(resolveToolName('socratic_examine')).toBe('cross_examine_argument')
            expect(resolveToolName('corpus_search')).toBe('verified_corpus_search')
            expect(resolveToolName('philosophical_corpus')).toBe('verified_corpus_search')
            expect(resolveToolName('search_philosophy_corpus')).toBe('verified_corpus_search')
            expect(resolveToolName('workspace_preset')).toBe('arrange_workspace_preset')
            expect(resolveToolName('arrange_workspace')).toBe('arrange_workspace_preset')
            expect(resolveToolName('create_flashcards')).toBe('generate_flashcards')
            expect(resolveToolName('flashcards')).toBe('generate_flashcards')
            expect(resolveToolName('compile_notebook')).toBe('export_notebook')
            expect(resolveToolName('concept_map')).toBe('create_concept_map')
            expect(resolveToolName('mindmap')).toBe('create_concept_map')
        })
    })

    describe('cross_examine_argument', () => {
        it('analyzes argument and detects unstated assumptions and opposing perspectives', async () => {
            const res = await executeToolCall({
                id: 'call-1',
                name: 'cross_examine_argument',
                argumentsJson: JSON.stringify({
                    argument: 'Technology is always good because everyone uses it and therefore it improves human flourishing naturally.',
                    philosophical_tradition: 'Nietzschean',
                }),
            })

            expect(res.ok).toBe(true)
            const parsed = JSON.parse(res.result)
            expect(parsed.ok).toBe(true)
            expect(parsed.detected_fallacies.length).toBeGreaterThan(0)
            expect(parsed.unstated_assumptions.length).toBeGreaterThan(0)
            expect(parsed.opposing_perspectives.length).toBeGreaterThan(0)
            expect(parsed.socratic_counter_dilemma).toContain('conditions are inverted')
            expect(parsed.verdict).toContain('Dialectical tension established')
            expect(parsed.core_claim).toContain('Technology is always good')
        })

        it('returns error when argument is missing', async () => {
            const res = await executeToolCall({
                id: 'call-2',
                name: 'cross_examine_argument',
                argumentsJson: '{}',
            })
            expect(res.ok).toBe(false)
            expect(res.result).toContain('argument is required')
        })
    })

    describe('verified_corpus_search', () => {
        it('finds canonical citations from philosophical corpus', async () => {
            const res = await executeToolCall({
                id: 'call-3',
                name: 'verified_corpus_search',
                argumentsJson: JSON.stringify({
                    query: 'abyss gaze monsters',
                    philosopher: 'Friedrich Nietzsche',
                }),
            })

            expect(res.ok).toBe(true)
            const parsed = JSON.parse(res.result)
            expect(parsed.ok).toBe(true)
            expect(parsed.citations.length).toBeGreaterThan(0)
            expect(parsed.citations[0].philosopher).toBe('Friedrich Nietzsche')
            expect(parsed.citations[0].work).toBe('Beyond Good and Evil')
            expect(res.citations).toBeDefined()
            expect(res.citations?.[0].url).toContain('nietzsche')
        })

        it('returns error when query is empty', async () => {
            const res = await executeToolCall({
                id: 'call-4',
                name: 'verified_corpus_search',
                argumentsJson: '{}',
            })
            expect(res.ok).toBe(false)
            expect(res.result).toContain('query is required')
        })
    })

    describe('arrange_workspace_preset', () => {
        it('applies deep_reading workspace preset with action payload', async () => {
            const host: HostSnapshot = {
                path: '/workspace',
            }
            const res = await executeToolCall(
                {
                    id: 'call-5',
                    name: 'arrange_workspace_preset',
                    argumentsJson: JSON.stringify({
                        preset: 'deep_reading',
                    }),
                },
                undefined,
                host
            )

            expect(res.ok).toBe(true)
            const parsed = JSON.parse(res.result)
            expect(parsed.ok).toBe(true)
            expect(parsed.preset).toBe('deep_reading')
            expect(parsed.layout).toBe('split')
            expect(parsed.left_path).toBe('/posts')
            expect(parsed.right_path).toBe('/notebooks')
            expect(res.action).toBeDefined()
            expect(res.action?.type).toBe('manage_windows')
        })

        it('applies studio workspace preset', async () => {
            const res = await executeToolCall({ id: 'c', name: 'arrange_workspace_preset', argumentsJson: JSON.stringify({ preset: 'studio' }) })
            const parsed = JSON.parse(res.result)
            expect(parsed.layout).toBe('split')
            expect(parsed.left_path).toBe('/notebooks')
            expect(parsed.right_path).toBe('/workspace-chat')
        })

        it('applies minimal workspace preset', async () => {
            const res = await executeToolCall({ id: 'c', name: 'arrange_workspace_preset', argumentsJson: JSON.stringify({ preset: 'minimal' }) })
            const parsed = JSON.parse(res.result)
            expect(parsed.layout).toBe('focus')
            expect(parsed.path).toBe('/notebooks')
        })

        it('applies split_dual workspace preset', async () => {
            const res = await executeToolCall({ id: 'c', name: 'arrange_workspace_preset', argumentsJson: JSON.stringify({ preset: 'split_dual' }) })
            const parsed = JSON.parse(res.result)
            expect(parsed.layout).toBe('split')
            expect(parsed.left_path).toBe('/notebooks')
            expect(parsed.right_path).toBe('/workspace-chat')
        })

        it('split_dual prefers first open notebook on the left', async () => {
            const host: HostSnapshot = {
                path: '/posts',
                windows: [{ path: '/other' }, { path: '/notebooks/nb-open' }],
            }
            const res = await executeToolCall(
                { id: 'c', name: 'arrange_workspace_preset', argumentsJson: JSON.stringify({ preset: 'split_dual' }) },
                undefined,
                host
            )
            const parsed = JSON.parse(res.result)
            expect(parsed.ok).toBe(true)
            expect(parsed.left_path).toBe('/notebooks/nb-open')
            expect(parsed.right_path).toBe('/workspace-chat')
        })

        it('applies research workspace preset', async () => {
            const res = await executeToolCall({ id: 'c', name: 'arrange_workspace_preset', argumentsJson: JSON.stringify({ preset: 'research' }) })
            const parsed = JSON.parse(res.result)
            expect(parsed.layout).toBe('split')
            expect(parsed.left_path).toBe('/scratchpad')
            expect(parsed.right_path).toBe('/notebooks')
        })

        it('returns error when preset_name is missing', async () => {
            const res = await executeToolCall({
                id: 'call-6',
                name: 'arrange_workspace_preset',
                argumentsJson: '{}',
            })
            expect(res.ok).toBe(false)
            expect(res.result).toContain('preset_name is required')
        })

        it('returns error when preset is unknown', async () => {
            const res = await executeToolCall({
                id: 'call-7',
                name: 'arrange_workspace_preset',
                argumentsJson: JSON.stringify({ preset: 'unknown_preset_foo' }),
            })
            expect(res.ok).toBe(false)
            expect(res.result).toContain('unknown preset')
        })
    })

    describe('generate_flashcards', () => {
        it('generates active-recall flashcards with study markdown', async () => {
            const res = await executeToolCall({
                id: 'call-7',
                name: 'generate_flashcards',
                argumentsJson: JSON.stringify({
                    topic: 'Epistemology Core Concepts',
                    flashcards: [
                        {
                            front: 'What is the Cartesian Cogito?',
                            back: 'Cogito, ergo sum: I think, therefore I am.',
                            hint: 'Descartes Meditations',
                            tags: ['epistemology', 'rationalism'],
                        },
                        {
                            front: 'What is Kant\'s synthetic a priori?',
                            back: 'Propositions that are informative (synthetic) yet known independently of experience (a priori).',
                            tags: ['kant', 'epistemology'],
                        },
                    ],
                }),
            })

            expect(res.ok).toBe(true)
            const parsed = JSON.parse(res.result)
            expect(parsed.ok).toBe(true)
            expect(parsed.total_cards).toBe(2)
            expect(parsed.deck_id).toMatch(/^deck-/)
            expect(parsed.deck_title).toBe('Epistemology Core Concepts')
            expect(parsed.flashcards[0].dueAt).toBeTruthy()
            expect(parsed.notebook_markdown).toContain('What is the Cartesian Cogito?')
            expect(parsed.notebook_markdown).toContain('Reveal Answer')
            expect(res.action?.type).toBe('open_window')
            expect(res.action?.payload.path).toContain('/study?deck=')
        })

        it('generates notebook action when save_to_notebook is true', async () => {
            const host: HostSnapshot = {
                notebookId: 'nb-123',
                notebookTitle: 'Philosophy 101',
            }
            const res = await executeToolCall(
                {
                    id: 'call-8',
                    name: 'generate_flashcards',
                    argumentsJson: JSON.stringify({
                        topic: 'Stoic Ethics',
                        cards: [
                            { front: 'What is dichotomy of control?', back: 'Dividing things into what is up to us and what is not.' },
                        ],
                        save_to_notebook: true,
                    }),
                },
                undefined,
                host
            )

            expect(res.ok).toBe(true)
            expect(res.action).toBeDefined()
            expect(res.action?.type).toBe('insert_notebook_block')
            expect(res.action?.payload.notebookId).toBe('nb-123')
        })

        it('returns error when flashcards array is empty', async () => {
            const res = await executeToolCall({
                id: 'call-9',
                name: 'generate_flashcards',
                argumentsJson: JSON.stringify({ cards: [] }),
            })
            expect(res.ok).toBe(false)
            expect(res.result).toContain('At least one valid flashcard')
        })
    })

    describe('export_notebook', () => {
        it('exports notebook to markdown with Table of Contents', async () => {
            const host: HostSnapshot = {
                notebooks: [
                    {
                        id: 'nb-1',
                        title: 'Dialectical Treatise',
                        content: '# Introduction\n\nSome text.\n\n## Historical Context\n\nMore details.\n\n### Objections\n\nCounter-points.',
                    },
                ],
            }

            const res = await executeToolCall(
                {
                    id: 'call-10',
                    name: 'export_notebook',
                    argumentsJson: JSON.stringify({
                        notebookId: 'nb-1',
                        format: 'markdown',
                        include_toc: true,
                    }),
                },
                undefined,
                host
            )

            expect(res.ok).toBe(true)
            const parsed = JSON.parse(res.result)
            expect(parsed.ok).toBe(true)
            expect(parsed.format).toBe('markdown')
            expect(parsed.document).toContain('Table of Contents')
            expect(parsed.document).toContain('[Introduction](#introduction)')
            expect(res.artifact).toBeDefined()
            expect(res.artifact?.type).toBe('markdown')
        })

        it('exports notebook to latex document', async () => {
            const host: HostSnapshot = {
                notebooks: [
                    {
                        id: 'nb-2',
                        title: 'Critique of Pure Reason Notes',
                        content: '# Transcendental Aesthetic\n\nSpace and time as forms of intuition.',
                    },
                ],
            }

            const res = await executeToolCall(
                {
                    id: 'call-11',
                    name: 'export_notebook',
                    argumentsJson: JSON.stringify({
                        notebookId: 'nb-2',
                        format: 'latex',
                    }),
                },
                undefined,
                host
            )

            expect(res.ok).toBe(true)
            const parsed = JSON.parse(res.result)
            expect(parsed.document).toContain('\\documentclass[11pt,a4paper]{article}')
            expect(parsed.document).toContain('\\section{Transcendental Aesthetic}')
        })

        it('exports notebook to html document', async () => {
            const host: HostSnapshot = {
                notebooks: [
                    {
                        id: 'nb-3',
                        title: 'Ethics Study',
                        content: '# Section 1\n\nParagraph text.',
                    },
                ],
            }

            const res = await executeToolCall(
                {
                    id: 'call-12',
                    name: 'export_notebook',
                    argumentsJson: JSON.stringify({
                        notebookId: 'nb-3',
                        format: 'html',
                    }),
                },
                undefined,
                host
            )

            expect(res.ok).toBe(true)
            const parsed = JSON.parse(res.result)
            expect(parsed.document).toContain('<!DOCTYPE html>')
            expect(parsed.document).toContain('<h1 id="Section 1">Section 1</h1>')
            expect(res.artifact?.type).toBe('html')
        })
        it('fails closed when notebookId is supplied but missing from host', async () => {
            const host: HostSnapshot = {
                notebooks: [
                    {
                        id: 'nb-real',
                        title: 'Real Notes',
                        content: '# Keep me\n\nBody.',
                    },
                ],
                selection: 'SELECTION MUST NOT LEAK INTO WRONG-ID EXPORT',
                notebookTitle: 'Bound title poison',
            }

            const res = await executeToolCall(
                {
                    id: 'call-export-missing',
                    name: 'export_notebook',
                    argumentsJson: JSON.stringify({
                        notebookId: 'nb-missing',
                        format: 'markdown',
                    }),
                },
                undefined,
                host
            )

            expect(res.ok).toBe(false)
            expect(res.result).toContain('not found')
            expect(res.result).not.toContain('SELECTION MUST NOT LEAK')
            expect(res.artifact).toBeUndefined()
        })

    })

    describe('create_concept_map', () => {
        it('creates a canvas artifact with auto-calculated grid positions', async () => {
            const res = await executeToolCall({
                id: 'call-13',
                name: 'create_concept_map',
                argumentsJson: JSON.stringify({
                    title: 'Phenomenology of Perception',
                    nodes: [
                        { id: 'n1', label: 'Embodied Subject' },
                        { id: 'n2', label: 'Horizonal Awareness' },
                        { id: 'n3', label: 'Motor Intentionality' },
                        { id: 'n4', label: 'Lebenswelt' },
                    ],
                    edges: [
                        { from: 'n1', to: 'n2', label: 'discloses' },
                        { from: 'n1', to: 'n3', label: 'acts via' },
                        { from: 'n3', to: 'n4', label: 'embedded in' },
                    ],
                }),
            })

            expect(res.ok).toBe(true)
            expect(res.artifact).toBeDefined()
            expect(res.artifact?.type).toBe('canvas')
            const parsedSpec = JSON.parse(res.artifact!.content)
            expect(parsedSpec.title).toBe('Phenomenology of Perception')
            expect(parsedSpec.nodes.length).toBe(4)
            expect(parsedSpec.edges.length).toBe(3)
            // Verify auto-calculated coordinates
            expect(typeof parsedSpec.nodes[0].x).toBe('number')
            expect(typeof parsedSpec.nodes[0].y).toBe('number')
            expect(parsedSpec.edges[0].label).toBe('discloses')
        })

        it('returns error when nodes are empty', async () => {
            const res = await executeToolCall({
                id: 'call-14',
                name: 'create_concept_map',
                argumentsJson: JSON.stringify({ title: 'Empty', nodes: [] }),
            })
            expect(res.ok).toBe(false)
            expect(res.result).toContain('At least one node is required')
        })
    })

    describe('plan mode permissions', () => {
        it('allows read/analytical tools in plan mode', async () => {
            const res1 = await executeToolCall(
                {
                    id: 'call-15',
                    name: 'cross_examine_argument',
                    argumentsJson: JSON.stringify({ argument: 'Freedom is an illusion.' }),
                },
                undefined,
                undefined,
                'plan'
            )
            expect(res1.ok).toBe(true)

            const res2 = await executeToolCall(
                {
                    id: 'call-16',
                    name: 'verified_corpus_search',
                    argumentsJson: JSON.stringify({ query: 'amor fati' }),
                },
                undefined,
                undefined,
                'plan'
            )
            expect(res2.ok).toBe(true)
        })

        it('blocks mutating tools in plan mode', async () => {
            const res = await executeToolCall(
                {
                    id: 'call-17',
                    name: 'arrange_workspace_preset',
                    argumentsJson: JSON.stringify({ preset: 'studio' }),
                },
                undefined,
                undefined,
                'plan'
            )
            expect(res.ok).toBe(false)
            expect(res.result).toContain('locked in plan mode')
        })
    })
})
