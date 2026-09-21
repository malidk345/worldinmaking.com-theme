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

const CANVAS_GRID = { colsMin: 3, gapX: 260, gapY: 160, startX: 100, startY: 100 }

/** Fill missing (or all-stacked) coordinates so a map is readable. */
export function layoutCanvasNodes<T extends { x?: number; y?: number }>(nodes: T[]): Array<T & { x: number; y: number }> {
    if (!nodes.length) return []
    const stacked =
        nodes.length > 1 &&
        nodes.every((node) => (Number(node.x) || 0) === (Number(nodes[0].x) || 0) && (Number(node.y) || 0) === (Number(nodes[0].y) || 0))
    const cols = Math.max(CANVAS_GRID.colsMin, Math.ceil(Math.sqrt(nodes.length)) || CANVAS_GRID.colsMin)
    return nodes.map((node, index) => {
        const hasPoint = typeof node.x === 'number' && typeof node.y === 'number'
        if (hasPoint && !stacked) return { ...node, x: node.x as number, y: node.y as number }
        const col = index % cols
        const row = Math.floor(index / cols)
        return {
            ...node,
            x: CANVAS_GRID.startX + col * CANVAS_GRID.gapX,
            y: CANVAS_GRID.startY + row * CANVAS_GRID.gapY,
        }
    })
}

export function withCanvasLayout(spec: CanvasSpec): CanvasSpec {
    return { ...spec, nodes: layoutCanvasNodes(spec.nodes) }
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

/** Presets the viewport can draw without an objects[] list. `custom` alone is not enough. */
export const MODEL3D_VIEWPORT_PRESETS = new Set([
    'polyhedra',
    'orbital_system',
    'dna_helix',
    'ontology_network',
    'torus_knot',
])

function asVec3(value: unknown, fallback?: [number, number, number]): [number, number, number] | undefined {
    if (Array.isArray(value) && value.length >= 3) {
        return [Number(value[0]) || 0, Number(value[1]) || 0, Number(value[2]) || 0]
    }
    return fallback
}

function asSize3(raw: Record<string, unknown>): [number, number, number] | undefined {
    const direct = raw.size ?? raw.dimensions ?? raw.scale3
    if (Array.isArray(direct) && direct.length >= 3) {
        return [Number(direct[0]) || 1, Number(direct[1]) || 1, Number(direct[2]) || 1]
    }
    const w = raw.width ?? raw.w
    const h = raw.height ?? raw.h
    const d = raw.depth ?? raw.d ?? raw.length
    if (typeof w === 'number' || typeof h === 'number' || typeof d === 'number') {
        return [Number(w) || 1, Number(h) || 1, Number(d) || 1]
    }
    return undefined
}

function childList(raw: Record<string, unknown>): unknown[] | undefined {
    for (const key of ['children', 'parts', 'nodes', 'items', 'meshes', 'objects', 'elements']) {
        const value = raw[key]
        if (Array.isArray(value)) return value
    }
    return undefined
}

/** Count leaf primitives (groups alone do not count). */
export function countModel3DRenderable(objects: Model3DObjectSpec[] | undefined): number {
    if (!objects?.length) return 0
    let total = 0
    for (const obj of objects) {
        const kind = String(obj.type || 'box').toLowerCase()
        if (kind === 'group') {
            total += countModel3DRenderable(obj.children)
            continue
        }
        total += 1
    }
    return total
}

export function model3dGeometryDigest(content: string): string {
    const spec = parseModel3DSpecStrict(content)
    if (!spec) return ''
    if (spec.url) return `url:${spec.url.slice(0, 80)}`
    const objects = spec.objects || []
    const renderable = countModel3DRenderable(objects)
    if (renderable <= 0) return ''
    const labels = objects.slice(0, 10).map((obj) => obj.name || obj.type || 'obj')
    const more = objects.length > 10 ? ', …' : ''
    return `renderable:${renderable} objects:${objects.length} [${labels.join(', ')}${more}]`
}

function normalizeObject(rawObj: any): Model3DObjectSpec | null {
    if (!rawObj || typeof rawObj !== 'object') return null
    const raw = rawObj as Record<string, unknown>
    const typeHint = raw.type ?? raw.shape ?? raw.primitive ?? raw.kind ?? (Array.isArray(raw.vertices) ? 'custom_mesh' : undefined)
    const nestedChildren = childList(raw)
    const type = String(typeHint || (nestedChildren ? 'group' : 'box')).toLowerCase() as Model3DPrimitiveType
    const color =
        typeof raw.color === 'string'
            ? raw.color
            : typeof raw.colour === 'string'
              ? raw.colour
              : undefined
    return {
        id: raw.id ? String(raw.id) : undefined,
        name: raw.name ? String(raw.name) : typeof raw.label === 'string' ? raw.label : undefined,
        type,
        size: asSize3(raw),
        radius: typeof raw.radius === 'number' ? raw.radius : undefined,
        radiusTop: typeof raw.radiusTop === 'number' ? raw.radiusTop : undefined,
        radiusBottom: typeof raw.radiusBottom === 'number' ? raw.radiusBottom : undefined,
        height: typeof raw.height === 'number' ? raw.height : undefined,
        tube: typeof raw.tube === 'number' ? raw.tube : undefined,
        radialSegments: typeof raw.radialSegments === 'number' ? raw.radialSegments : undefined,
        position: asVec3(raw.position ?? raw.pos ?? raw.coords, [0, 0, 0]),
        rotation: asVec3(raw.rotation ?? raw.rot),
        scale: Array.isArray(raw.scale)
            ? [Number(raw.scale[0]) || 1, Number(raw.scale[1]) || 1, Number(raw.scale[2]) || 1]
            : typeof raw.scale === 'number'
              ? raw.scale
              : undefined,
        color,
        roughness: typeof raw.roughness === 'number' ? Math.max(0, Math.min(1, raw.roughness)) : undefined,
        metalness: typeof raw.metalness === 'number' ? Math.max(0, Math.min(1, raw.metalness)) : undefined,
        opacity: typeof raw.opacity === 'number' ? Math.max(0, Math.min(1, raw.opacity)) : undefined,
        transparent: typeof raw.transparent === 'boolean' ? raw.transparent : undefined,
        wireframe: typeof raw.wireframe === 'boolean' ? raw.wireframe : undefined,
        emissive: typeof raw.emissive === 'string' ? raw.emissive : undefined,
        emissiveIntensity: typeof raw.emissiveIntensity === 'number' ? raw.emissiveIntensity : undefined,
        vertices: Array.isArray(raw.vertices) ? raw.vertices : undefined,
        faces: Array.isArray(raw.faces) ? raw.faces : undefined,
        children: nestedChildren
            ? (nestedChildren.map(normalizeObject).filter(Boolean) as Model3DObjectSpec[])
            : undefined,
    }
}

function buildModel3DSpec(raw: any): Model3DSpec {
    const rawObjects = Array.isArray(raw.objects)
        ? raw.objects
        : Array.isArray(raw.scene)
          ? raw.scene
          : Array.isArray(raw.elements)
            ? raw.elements
            : Array.isArray(raw.meshes)
              ? raw.meshes
              : Array.isArray(raw.items)
                ? raw.items
                : Array.isArray(raw.bodies)
                  ? raw.bodies
                  : Array.isArray(raw.entities)
                    ? raw.entities
                    : undefined
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

function parseModel3DRaw(content: string | unknown): unknown | null {
    if (typeof content === 'object' && content !== null) return content
    const text = String(content || '').trim()
    if (!text) return null
    try {
        const parsed = JSON.parse(text)
        return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
        const match = text.match(/\{[\s\S]*("objects"|"preset"|"scene"|"url"|"modelUrl"|"meshes"|"items")[\s\S]*\}/)
        if (!match) return null
        try {
            const parsed = JSON.parse(match[0])
            return parsed && typeof parsed === 'object' ? parsed : null
        } catch {
            return null
        }
    }
}

export function parseModel3DSpecStrict(content: string | unknown): Model3DSpec | null {
    const raw = parseModel3DRaw(content)
    if (!raw || typeof raw !== 'object') return null
    const row = raw as Record<string, unknown>
    const spec = buildModel3DSpec(row)
    const presetKey = typeof row.preset === 'string' ? row.preset.trim().toLowerCase() : ''
    const hasViewportPreset = MODEL3D_VIEWPORT_PRESETS.has(presetKey)
    const renderable = countModel3DRenderable(spec.objects)
    // Fail closed: id/title/materials/camera or empty groups alone must not pass as a scene.
    // `preset: "custom"` without leaf geometry is not a drawable viewport preset.
    if (!spec.url && renderable <= 0 && !hasViewportPreset) return null
    return spec
}

export function parseModel3DSpec(content: string | unknown): Model3DSpec {
    return (
        parseModel3DSpecStrict(content) || {
            title: '3D Scene',
            preset: 'polyhedra',
            theme: 'gold',
            wireframe: false,
            autoRotate: true,
            grid: true,
        }
    )
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
