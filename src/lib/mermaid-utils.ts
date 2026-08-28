export const MERMAID_DIAGRAM_START =
    /^(?:flowchart(?:-elk)?|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|gitGraph|mindmap|timeline|journey|quadrantChart|requirementDiagram|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|sankey-beta|xychart-beta|block-beta|packet-beta|architecture-beta|kanban|radar-beta|treemap-beta)\b/

const DIAGRAM_REQUEST_EN =
    /\b(mermaid|flowchart|sequence\s*diagram|class\s*diagram|state\s*diagram|er\s*diagram|git\s*graph|mindmap|gantt(?:\s*chart)?|timeline\s*diagram)\b/i
const DIAGRAM_REQUEST_TR =
    /(diyagram|akış\s*şemas[ıi]|akis\s*semasi|şema\s*(?:çiz|ciz|oluştur|olustur)|sema\s*(?:ciz|olustur))/i

export function isDiagramRequest(prompt: string): boolean {
    const text = String(prompt || '')
    return DIAGRAM_REQUEST_EN.test(text) || DIAGRAM_REQUEST_TR.test(text)
}

export function isMermaidLanguage(language?: string | null): boolean {
    return /^(mermaid)$/i.test(String(language || '').trim())
}

export function cleanMermaidSource(code: string): string {
    let text = String(code || '')
        .replace(/\r\n/g, '\n')
        .trim()
    text = text.replace(/^```(?:mermaid)?[ \t]*\n?/i, '')
    text = text.replace(/\n```[ \t]*$/i, '')
    return text.trim()
}

export function isMermaidSource(code: string): boolean {
    const clean = cleanMermaidSource(code)
    if (!clean) return false
    const stripped = clean
        .replace(/^%%\{[\s\S]*?\}%%\s*/g, '')
        .replace(/^(?:%%[^\n]*\n)+/, '')
        .trim()
    return MERMAID_DIAGRAM_START.test(stripped)
}

export function artifactLooksLikeMermaid(artifact: {
    type?: string
    language?: string
    content?: string
}): boolean {
    if (artifact.type === 'mermaid' || isMermaidLanguage(artifact.language)) return true
    return isMermaidSource(String(artifact.content || ''))
}
