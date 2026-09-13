/**
 * Declarative schemas and parsers for WIM Interactive Visual Engine.
 * Supports Infinite Vector Canvas, 3D Concept Models, and Parametric Simulations.
 */

// --- 1. Canvas / Mindmap Schema ---

export interface CanvasNode {
    id: string
    label: string
    description?: string
    x: number
    y: number
    color?: 'amber' | 'emerald' | 'rose' | 'blue' | 'purple' | 'slate' | string
    icon?: string
    type?: 'concept' | 'action' | 'entity' | 'decision' | 'card'
    tags?: string[]
}

export interface CanvasEdge {
    from: string
    to: string
    label?: string
    style?: 'solid' | 'dashed' | 'dotted'
    color?: string
}

export interface CanvasSpec {
    title?: string
    description?: string
    nodes: CanvasNode[]
    edges: CanvasEdge[]
}

export function parseCanvasSpec(content: string | unknown): CanvasSpec | null {
    if (!content) return null
    if (typeof content === 'object' && content !== null) {
        const raw = content as any
        if (Array.isArray(raw.nodes)) {
            return {
                title: typeof raw.title === 'string' ? raw.title : undefined,
                description: typeof raw.description === 'string' ? raw.description : undefined,
                nodes: raw.nodes,
                edges: Array.isArray(raw.edges) ? raw.edges : [],
            }
        }
    }

    const text = String(content).trim()
    try {
        const parsed = JSON.parse(text)
        if (parsed && Array.isArray(parsed.nodes)) {
            return {
                title: typeof parsed.title === 'string' ? parsed.title : undefined,
                description: typeof parsed.description === 'string' ? parsed.description : undefined,
                nodes: parsed.nodes,
                edges: Array.isArray(parsed.edges) ? parsed.edges : [],
            }
        }
    } catch {
        const match = text.match(/\{[\s\S]*"nodes"[\s\S]*\}/)
        if (match) {
            try {
                const parsed = JSON.parse(match[0])
                if (parsed && Array.isArray(parsed.nodes)) {
                    return {
                        title: typeof parsed.title === 'string' ? parsed.title : undefined,
                        description: typeof parsed.description === 'string' ? parsed.description : undefined,
                        nodes: parsed.nodes,
                        edges: Array.isArray(parsed.edges) ? parsed.edges : [],
                    }
                }
            } catch {
                /* ignore */
            }
        }
    }

    return null
}

// --- 2. 3D Model Schema ---

export interface Model3DSpec {
    title?: string
    description?: string
    preset?: 'polyhedra' | 'orbital_system' | 'dna_helix' | 'ontology_network' | 'torus_knot'
    theme?: 'gold' | 'cyan' | 'emerald' | 'crimson' | 'violet'
    wireframe?: boolean
    autoRotate?: boolean
    nodes?: Array<{ label: string; position?: [number, number, number]; color?: string }>
}

export function parseModel3DSpec(content: string | unknown): Model3DSpec {
    if (typeof content === 'object' && content !== null) {
        const raw = content as any
        return {
            title: raw.title || '3D Model',
            description: raw.description,
            preset: raw.preset || 'polyhedra',
            theme: raw.theme || 'gold',
            wireframe: raw.wireframe !== false,
            autoRotate: raw.autoRotate !== false,
            nodes: Array.isArray(raw.nodes) ? raw.nodes : [],
        }
    }

    const text = String(content || '').trim()
    try {
        const parsed = JSON.parse(text)
        if (parsed) {
            return {
                title: parsed.title || '3D Model',
                description: parsed.description,
                preset: parsed.preset || 'polyhedra',
                theme: parsed.theme || 'gold',
                wireframe: parsed.wireframe !== false,
                autoRotate: parsed.autoRotate !== false,
                nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
            }
        }
    } catch {
        const match = text.match(/\{[\s\S]*"preset"[\s\S]*\}/)
        if (match) {
            try {
                const parsed = JSON.parse(match[0])
                return {
                    title: parsed.title || '3D Model',
                    description: parsed.description,
                    preset: parsed.preset || 'polyhedra',
                    theme: parsed.theme || 'gold',
                    wireframe: parsed.wireframe !== false,
                    autoRotate: parsed.autoRotate !== false,
                    nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
                }
            } catch {
                /* ignore */
            }
        }
    }

    return {
        title: '3D Konsept Modeli',
        preset: 'polyhedra',
        theme: 'gold',
        wireframe: true,
        autoRotate: true,
    }
}

// --- 3. Parametric Simulation Schema ---

export interface SimulationVariable {
    id: string
    label: string
    min: number
    max: number
    step?: number
    default: number
    unit?: string
    description?: string
}

export interface SimulationOutput {
    id: string
    label: string
    formula: string
    unit?: string
    format?: 'number' | 'percent' | 'currency'
    description?: string
}

export interface SimulationSpec {
    title?: string
    description?: string
    variables: SimulationVariable[]
    outputs: SimulationOutput[]
    chart?: {
        type?: 'area' | 'line' | 'bar'
        xAxisLabel?: string
        yAxisLabel?: string
        series?: Array<{ key: string; name: string; color?: string }>
        timeSteps?: number
    }
}

export function parseSimulationSpec(content: string | unknown): SimulationSpec | null {
    if (!content) return null
    if (typeof content === 'object' && content !== null) {
        const raw = content as any
        if (Array.isArray(raw.variables) && Array.isArray(raw.outputs)) {
            return raw as SimulationSpec
        }
    }

    const text = String(content).trim()
    try {
        const parsed = JSON.parse(text)
        if (parsed && Array.isArray(parsed.variables)) {
            return parsed as SimulationSpec
        }
    } catch {
        const match = text.match(/\{[\s\S]*"variables"[\s\S]*\}/)
        if (match) {
            try {
                const parsed = JSON.parse(match[0])
                if (parsed && Array.isArray(parsed.variables)) {
                    return parsed as SimulationSpec
                }
            } catch {
                /* ignore */
            }
        }
    }

    return null
}
