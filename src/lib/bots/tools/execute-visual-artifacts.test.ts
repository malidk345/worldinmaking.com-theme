import { describe, it, expect } from 'vitest'
import { executeToolCall } from './execute'
import {
    countModel3DRenderable,
    parseCanvasSpec,
    parseModel3DSpec,
    parseSimulationSpec,
} from '../../ai/visual-artifacts'

describe('Interactive Visual Artifacts (Canvas, 3D Models, Parametric Simulation)', () => {
    it('creates canvas artifact with alias "mindmap"', async () => {
        const spec = {
            title: 'Epistemology Map',
            nodes: [
                { id: '1', label: 'Rationalism', x: 100, y: 100, color: 'amber' },
                { id: '2', label: 'Empiricism', x: 400, y: 100, color: 'emerald' },
            ],
            edges: [{ from: '1', to: '2', label: 'Synthesized by Kant' }],
        }

        const result = await executeToolCall({
            id: 'call-canvas-1',
            name: 'create_artifact',
            argumentsJson: JSON.stringify({
                kind: 'mindmap',
                title: 'Kant Synthesis Mindmap',
                body: JSON.stringify(spec),
            }),
        })

        expect(result.ok).toBe(true)
        expect(result.artifact).toBeDefined()
        expect(result.artifact?.type).toBe('canvas')
        expect(result.artifact?.title).toBe('Kant Synthesis Mindmap')
        expect(result.artifact?.language).toBe('json')

        const parsed = parseCanvasSpec(result.artifact?.content)
        expect(parsed).not.toBeNull()
        expect(parsed?.nodes.length).toBe(2)
        expect(parsed?.edges[0].label).toBe('Synthesized by Kant')
    })

    it('creates 3d model artifact with alias "3d"', async () => {
        const modelSpec = {
            title: 'Platonic Ontology',
            preset: 'polyhedra',
            theme: 'gold',
            wireframe: true,
        }

        const result = await executeToolCall({
            id: 'call-model-1',
            name: 'create_artifact',
            argumentsJson: JSON.stringify({
                type: '3d',
                title: 'Icosahedron Concept',
                content: JSON.stringify(modelSpec),
            }),
        })

        expect(result.ok).toBe(true)
        expect(result.artifact?.type).toBe('model3d')
        expect(result.artifact?.title).toBe('Icosahedron Concept')

        const parsed = parseModel3DSpec(result.artifact?.content)
        expect(parsed.preset).toBe('polyhedra')
        expect(parsed.theme).toBe('gold')
    })

    it('creates simulation artifact with alias "parametric"', async () => {
        const simSpec = {
            title: 'Stoic Stress Simulator',
            variables: [
                { id: 'stress', label: 'External Stress', min: 0, max: 100, default: 50 },
                { id: 'control', label: 'Internal Control', min: 0, max: 100, default: 80 },
            ],
            outputs: [
                { id: 'peace', label: 'Inner Peace', formula: '100 - (stress * (1 - control / 100))', format: 'percent' },
            ],
            chart: { type: 'area' },
        }

        const result = await executeToolCall({
            id: 'call-sim-1',
            name: 'create_artifact',
            argumentsJson: JSON.stringify({
                type: 'parametric',
                title: 'Inner Peace Model',
                content: JSON.stringify(simSpec),
            }),
        })

        expect(result.ok).toBe(true)
        expect(result.artifact?.type).toBe('simulation')

        const parsed = parseSimulationSpec(result.artifact?.content)
        expect(parsed).not.toBeNull()
        expect(parsed?.variables.length).toBe(2)
        expect(parsed?.outputs[0].id).toBe('peace')
    })

    it('creates and parses an arbitrary 3D architectural house model with objects and primitives', async () => {
        const houseSpec = {
            title: 'Modern Müstakil Ev',
            description: 'Bahçeli, çatılı ve pencereli 3D mimari model',
            grid: true,
            ground: { show: true, color: '#15803d', size: 30 },
            objects: [
                { name: 'Zemin / Çimen', type: 'box', size: [24, 0.2, 24], position: [0, -0.1, 0], color: '#166534' },
                { name: 'Ev Gövdesi (Duvarlar)', type: 'box', size: [8, 4, 6], position: [0, 2, 0], color: '#f8fafc' },
                { name: 'Piramit Çatı', type: 'pyramid', radius: 6, height: 2.5, position: [0, 5.25, 0], color: '#dc2626' },
                { name: 'Baca', type: 'box', size: [0.8, 2, 0.8], position: [2.2, 5.5, 1], color: '#7f1d1d' },
                { name: 'Kapı', type: 'box', size: [1.4, 2.4, 0.15], position: [0, 1.2, 3.05], color: '#78350f' },
                { name: 'Pencereler', type: 'box', size: [1.5, 1.5, 0.1], position: [-2.4, 2.2, 3.05], color: '#38bdf8', transparent: true, opacity: 0.7 },
            ],
        }

        const result = await executeToolCall({
            id: 'call-house-3d',
            name: 'create_artifact',
            argumentsJson: JSON.stringify({
                type: 'model3d',
                title: '3D House Architecture',
                content: JSON.stringify(houseSpec),
            }),
        })

        expect(result.ok).toBe(true)
        expect(result.artifact?.type).toBe('model3d')

        const parsed = parseModel3DSpec(result.artifact?.content)
        expect(parsed.preset).toBe('custom')
        expect(parsed.grid).toBe(true)
        expect(parsed.ground?.show).toBe(true)
        expect(parsed.ground?.color).toBe('#15803d')
        expect(parsed.objects).toBeDefined()
        expect(parsed.objects?.length).toBe(6)
        expect(parsed.objects?.[1].name).toBe('Ev Gövdesi (Duvarlar)')
        expect(parsed.objects?.[1].size).toEqual([8, 4, 6])
        expect(parsed.objects?.[2].type).toBe('pyramid')
        expect(parsed.objects?.[5].transparent).toBe(true)
    })

    it('handles malformed JSON gracefully in parsers without crashing', () => {
        expect(parseCanvasSpec('')).toBeNull()
        expect(parseCanvasSpec('{ invalid json')).toBeNull()

        const default3D = parseModel3DSpec('invalid')
        expect(default3D.preset).toBe('polyhedra')

        expect(parseSimulationSpec('not a json')).toBeNull()
    })

    it('rejects invalid canvas JSON instead of opening an empty preview', async () => {
        const result = await executeToolCall({
            id: 'call-bad-canvas',
            name: 'create_artifact',
            argumentsJson: JSON.stringify({
                type: 'canvas',
                title: 'Broken map',
                content: '{ not json',
            }),
        })
        expect(result.ok).toBe(false)
        expect(result.artifact).toBeUndefined()
    })

    it('auto-grids canvas nodes that omit x/y', async () => {
        const result = await executeToolCall({
            id: 'call-grid-canvas',
            name: 'create_artifact',
            argumentsJson: JSON.stringify({
                type: 'canvas',
                title: 'Ungridded',
                content: JSON.stringify({
                    title: 'Ungridded',
                    nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
                    edges: [{ from: 'a', to: 'b' }],
                }),
            }),
        })
        expect(result.ok).toBe(true)
        const parsed = parseCanvasSpec(result.artifact?.content)
        expect(parsed?.nodes[0].x).toBe(100)
        expect(parsed?.nodes[1].x).toBeGreaterThan(parsed!.nodes[0].x)
        expect(parsed?.nodes[2].y).toBeGreaterThanOrEqual(parsed!.nodes[0].y)
    })

    it('reuses the open artifact id and bumps version on the same title', async () => {
        const result = await executeToolCall(
            {
                id: 'call-rev-1',
                name: 'create_artifact',
                argumentsJson: JSON.stringify({
                    type: 'canvas',
                    title: 'Kant Map',
                    content: JSON.stringify({
                        nodes: [{ id: '1', label: 'Kant', x: 10, y: 10 }],
                        edges: [],
                    }),
                }),
            },
            undefined,
            {
                artifactId: 'art-open-1',
                artifactTitle: 'Kant Map',
                artifactType: 'canvas',
                artifactVersion: 2,
            }
        )
        expect(result.ok).toBe(true)
        expect(result.artifact?.id).toBe('art-open-1')
        expect(result.artifact?.version).toBe(3)
    })
})


describe('model3d blank-scene guards (post #777)', () => {
    it('rejects empty groups / materials-only / preset custom without leaf geometry', async () => {
        const blankish = [
            { title: 'Empty group', objects: [{ type: 'group', name: 'Building', children: [] }] },
            { title: 'Materials only', materials: [{ id: 'wood', color: '#888' }], camera: { position: [5, 5, 5] }, preset: 'custom' },
            { title: 'Parts not mapped previously', objects: [{ type: 'group', name: 'House', parts: [] }] },
        ]
        for (const body of blankish) {
            const result = await executeToolCall({
                id: 'call-blank-3d',
                name: 'create_artifact',
                argumentsJson: JSON.stringify({
                    type: 'model3d',
                    title: body.title,
                    content: JSON.stringify(body),
                }),
            })
            expect(result.ok).toBe(false)
            expect(result.artifact).toBeUndefined()
        }
    })

    it('accepts parts[] as children and still persists full body (compaction is loop-only)', async () => {
        const body = {
            title: 'House via parts',
            objects: [
                {
                    type: 'group',
                    name: 'House',
                    parts: [
                        { type: 'box', name: 'Walls', size: [8, 4, 6], position: [0, 2, 0], color: '#f8fafc' },
                        { type: 'pyramid', name: 'Roof', radius: 5, height: 2, position: [0, 5, 0], color: '#dc2626' },
                    ],
                },
            ],
        }
        const result = await executeToolCall({
            id: 'call-parts-3d',
            name: 'create_artifact',
            argumentsJson: JSON.stringify({
                type: 'model3d',
                title: 'House via parts',
                content: JSON.stringify(body),
            }),
        })
        expect(result.ok).toBe(true)
        expect(result.artifact?.content).toContain('House')
        expect(result.artifact?.content.length).toBeGreaterThan(80)
        const parsed = parseModel3DSpec(result.artifact?.content)
        expect(countModel3DRenderable(parsed.objects)).toBe(2)
        // Tool result stays id/title — body lives on artifact for the UI.
        expect(result.result).not.toContain('size')
        expect(JSON.parse(result.result).title).toBe('House via parts')
    })
})
