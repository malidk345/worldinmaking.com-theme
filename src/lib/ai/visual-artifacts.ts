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

// --- 2. 3D Model & Arbitrary Scene Schema ---

export type Model3DPrimitiveType =
    | 'box'
    | 'cube'
    | 'sphere'
    | 'cylinder'
    | 'cone'
    | 'pyramid'
    | 'plane'
    | 'torus'
    | 'ring'
    | 'capsule'
    | 'wedge'
    | 'prism'
    | 'mesh'
    | 'custom_mesh'
    | 'group'

export interface Model3DObjectSpec {
    id?: string
    name?: string
    type?: Model3DPrimitiveType | string
    size?: [number, number, number] // [width, height, depth]
    radius?: number // for sphere, cylinder, cone, torus
    radiusTop?: number // for cylinder
    radiusBottom?: number // for cylinder
    height?: number // for cylinder, cone, prism
    tube?: number // for torus
    radialSegments?: number
    position?: [number, number, number] // [x, y, z]
    rotation?: [number, number, number] // [rx, ry, rz] in degrees or radians
    scale?: [number, number, number] | number
    color?: string
    roughness?: number
    metalness?: number
    opacity?: number
    transparent?: boolean
    wireframe?: boolean
    emissive?: string
    emissiveIntensity?: number
    vertices?: number[][] // [[x, y, z], ...] for custom polyhedral mesh
    faces?: number[][] // [[i1, i2, i3], ...]
    children?: Model3DObjectSpec[]
}

export interface Model3DSpec {
    title?: string
    description?: string
    url?: string // Direct URL to load external GLTF / GLB 3D model
    modelUrl?: string
    preset?: 'polyhedra' | 'orbital_system' | 'dna_helix' | 'ontology_network' | 'torus_knot' | 'custom'
    theme?: 'gold' | 'cyan' | 'emerald' | 'crimson' | 'violet' | 'studio'
    wireframe?: boolean
    autoRotate?: boolean
    grid?: boolean
    ground?: {
        show?: boolean
        color?: string
        size?: number
    }
    camera?: {
        position?: [number, number, number]
        target?: [number, number, number]
        fov?: number
    }
    objects?: Model3DObjectSpec[]
    nodes?: Array<{ label: string; position?: [number, number, number]; color?: string }>
}

function normalizeObject(rawObj: any): Model3DObjectSpec | null {
    if (!rawObj || typeof rawObj !== 'object') return null
    const type = String(rawObj.type || (rawObj.vertices ? 'custom_mesh' : 'box')).toLowerCase() as Model3DPrimitiveType
    return {
        id: rawObj.id ? String(rawObj.id) : undefined,
        name: rawObj.name ? String(rawObj.name) : undefined,
        type,
        size: Array.isArray(rawObj.size) && rawObj.size.length >= 3 ? [Number(rawObj.size[0]) || 1, Number(rawObj.size[1]) || 1, Number(rawObj.size[2]) || 1] : undefined,
        radius: typeof rawObj.radius === 'number' ? rawObj.radius : undefined,
        radiusTop: typeof rawObj.radiusTop === 'number' ? rawObj.radiusTop : undefined,
        radiusBottom: typeof rawObj.radiusBottom === 'number' ? rawObj.radiusBottom : undefined,
        height: typeof rawObj.height === 'number' ? rawObj.height : undefined,
        tube: typeof rawObj.tube === 'number' ? rawObj.tube : undefined,
        radialSegments: typeof rawObj.radialSegments === 'number' ? rawObj.radialSegments : undefined,
        position: Array.isArray(rawObj.position) && rawObj.position.length >= 3 ? [Number(rawObj.position[0]) || 0, Number(rawObj.position[1]) || 0, Number(rawObj.position[2]) || 0] : [0, 0, 0],
        rotation: Array.isArray(rawObj.rotation) && rawObj.rotation.length >= 3 ? [Number(rawObj.rotation[0]) || 0, Number(rawObj.rotation[1]) || 0, Number(rawObj.rotation[2]) || 0] : undefined,
        scale: Array.isArray(rawObj.scale) ? [Number(rawObj.scale[0]) || 1, Number(rawObj.scale[1]) || 1, Number(rawObj.scale[2]) || 1] : (typeof rawObj.scale === 'number' ? rawObj.scale : undefined),
        color: typeof rawObj.color === 'string' ? rawObj.color : undefined,
        roughness: typeof rawObj.roughness === 'number' ? Math.max(0, Math.min(1, rawObj.roughness)) : undefined,
        metalness: typeof rawObj.metalness === 'number' ? Math.max(0, Math.min(1, rawObj.metalness)) : undefined,
        opacity: typeof rawObj.opacity === 'number' ? Math.max(0, Math.min(1, rawObj.opacity)) : undefined,
        transparent: typeof rawObj.transparent === 'boolean' ? rawObj.transparent : undefined,
        wireframe: typeof rawObj.wireframe === 'boolean' ? rawObj.wireframe : undefined,
        emissive: typeof rawObj.emissive === 'string' ? rawObj.emissive : undefined,
        emissiveIntensity: typeof rawObj.emissiveIntensity === 'number' ? rawObj.emissiveIntensity : undefined,
        vertices: Array.isArray(rawObj.vertices) ? rawObj.vertices : undefined,
        faces: Array.isArray(rawObj.faces) ? rawObj.faces : undefined,
        children: Array.isArray(rawObj.children) ? rawObj.children.map(normalizeObject).filter(Boolean) as Model3DObjectSpec[] : undefined,
    }
}

export function parseModel3DSpec(content: string | unknown): Model3DSpec {
    const buildSpec = (raw: any): Model3DSpec => {
        const rawObjects = Array.isArray(raw.objects) ? raw.objects : (Array.isArray(raw.scene) ? raw.scene : (Array.isArray(raw.elements) ? raw.elements : undefined))
        const objects = rawObjects ? (rawObjects.map(normalizeObject).filter(Boolean) as Model3DObjectSpec[]) : undefined
        const url = typeof raw.url === 'string' ? raw.url : (typeof raw.modelUrl === 'string' ? raw.modelUrl : (typeof raw.src === 'string' ? raw.src : undefined))

        return {
            title: raw.title || (objects && objects.length > 0 ? '3D Scene' : '3D Viewport'),
            description: raw.description,
            url,
            modelUrl: url,
            preset: raw.preset || (objects && objects.length > 0 ? 'custom' : 'polyhedra'),
            theme: raw.theme || 'studio',
            wireframe: raw.wireframe === true,
            autoRotate: raw.autoRotate !== false,
            grid: raw.grid !== false,
            ground: raw.ground && typeof raw.ground === 'object' ? {
                show: raw.ground.show !== false,
                color: typeof raw.ground.color === 'string' ? raw.ground.color : undefined,
                size: typeof raw.ground.size === 'number' ? raw.ground.size : undefined,
            } : undefined,
            camera: raw.camera && typeof raw.camera === 'object' ? {
                position: Array.isArray(raw.camera.position) ? [Number(raw.camera.position[0]) || 0, Number(raw.camera.position[1]) || 0, Number(raw.camera.position[2]) || 8] : undefined,
                target: Array.isArray(raw.camera.target) ? [Number(raw.camera.target[0]) || 0, Number(raw.camera.target[1]) || 0, Number(raw.camera.target[2]) || 0] : undefined,
                fov: typeof raw.camera.fov === 'number' ? raw.camera.fov : undefined,
            } : undefined,
            objects,
            nodes: Array.isArray(raw.nodes) ? raw.nodes : [],
        }
    }

    if (typeof content === 'object' && content !== null) {
        return buildSpec(content)
    }

    const text = String(content || '').trim()
    try {
        const parsed = JSON.parse(text)
        if (parsed && typeof parsed === 'object') {
            return buildSpec(parsed)
        }
    } catch {
        const match = text.match(/\{[\s\S]*("objects"|"preset"|"scene")[\s\S]*\}/)
        if (match) {
            try {
                const parsed = JSON.parse(match[0])
                if (parsed && typeof parsed === 'object') {
                    return buildSpec(parsed)
                }
            } catch {
                /* ignore */
            }
        }
    }

    return {
        title: '3D Scene',
        preset: 'polyhedra',
        theme: 'gold',
        wireframe: false,
        autoRotate: true,
        grid: true,
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
