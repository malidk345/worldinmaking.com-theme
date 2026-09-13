import { describe, it, expect } from 'vitest'
import { executeToolCall } from './execute'
import {
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

    it('handles malformed JSON gracefully in parsers without crashing', () => {
        expect(parseCanvasSpec('')).toBeNull()
        expect(parseCanvasSpec('{ invalid json')).toBeNull()

        const default3D = parseModel3DSpec('invalid')
        expect(default3D.preset).toBe('polyhedra')

        expect(parseSimulationSpec('not a json')).toBeNull()
    })
})
