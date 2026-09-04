import { isBlockedFetchUrl } from './fetch-url'
import type { HostSnapshot } from './host'

const MAX_BYTES = 500_000
const MAX_DOC_CHARS = 6_000


function applyKeywordFilter(content: string, filterQuery: string, label: string): { ok: true; content: string } | { ok: false; error: string } {
    if (!filterQuery) return { ok: true, content }
    const paragraphs = content.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
    const matched = paragraphs.filter((p) => p.toLowerCase().includes(filterQuery))
    if (matched.length === 0) {
        // Also try a single-pass includes on the whole doc before failing closed
        if (content.toLowerCase().includes(filterQuery)) {
            const idx = content.toLowerCase().indexOf(filterQuery)
            const start = Math.max(0, idx - 200)
            const end = Math.min(content.length, idx + filterQuery.length + 400)
            return { ok: true, content: content.slice(start, end) }
        }
        return {
            ok: false,
            error: `No passages matching "${filterQuery}" found in ${label} (keyword/substring filter — not embedding search). Do not invent citations from this document.`,
        }
    }
    return { ok: true, content: matched.join('\n\n') }
}

const FETCH_TIMEOUT_MS = 10_000

export interface ReadDocumentArgs {
    url?: string
    name?: string
    page?: number
    query?: string
}

function formatCsvToMarkdown(csvText: string, maxRows = 50): string {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0)
    if (lines.length === 0) return ''
    const rows = lines.slice(0, maxRows).map((line) => {
        return line.split(',').map((c) => c.replace(/^["']|["']$/g, '').trim())
    })
    if (rows.length === 0) return ''
    const header = rows[0]
    const divider = header.map(() => '---')
    const mdRows = [
        `| ${header.join(' | ')} |`,
        `| ${divider.join(' | ')} |`,
        ...rows.slice(1).map((r) => `| ${r.join(' | ')} |`),
    ]
    return mdRows.join('\n')
}

/**
 * Lightweight text stream extraction from binary PDF buffers (Edge-compatible).
 */
function extractPdfTextFast(uint8: Uint8Array): string[] {
    const decoder = new TextDecoder('latin1')
    const raw = decoder.decode(uint8)
    const pages: string[] = []

    // Look for /Page objects or BT ... ET text blocks
    const textBlocks: string[] = []
    const btRegex = /BT\s+([\s\S]*?)\s+ET/g
    let match: RegExpExecArray | null

    while ((match = btRegex.exec(raw)) !== null) {
        const block = match[1]
        // Extract string literals inside parentheses (Tj / TJ operators)
        const strRegex = /\((.*?)\)\s*T[jJ]/g
        let strMatch: RegExpExecArray | null
        const blockStrings: string[] = []
        while ((strMatch = strRegex.exec(block)) !== null) {
            const clean = strMatch[1]
                .replace(/\\([0-9]{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
                .replace(/\\([nrtbf\(\)\\])/g, (_, esc) => {
                    if (esc === 'n') return '\n'
                    if (esc === 'r') return '\r'
                    if (esc === 't') return '\t'
                    return esc
                })
                .trim()
            if (clean) blockStrings.push(clean)
        }
        if (blockStrings.length > 0) {
            textBlocks.push(blockStrings.join(' '))
        }
    }

    if (textBlocks.length > 0) {
        // Group into approximate pages of ~10 blocks each
        const pageSize = 8
        for (let i = 0; i < textBlocks.length; i += pageSize) {
            const chunk = textBlocks.slice(i, i + pageSize).join('\n')
            if (chunk.trim()) pages.push(chunk.trim())
        }
    } else {
        // Fallback: extract printable ASCII strings
        const ascii = raw
            .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        if (ascii.length > 50) {
            pages.push(ascii.slice(0, 8000))
        }
    }

    return pages
}

export async function executeReadDocument(
    args: ReadDocumentArgs,
    host?: HostSnapshot
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
    const rawUrl = (args.url || '').trim()
    const docName = (args.name || '').trim()
    const targetPage = typeof args.page === 'number' && args.page > 0 ? Math.floor(args.page) : undefined
    const filterQuery = (args.query || '').trim().toLowerCase()

    if (!rawUrl && !docName) {
        return { ok: false, error: 'url or document name is required' }
    }

    // 1. Resolve from Host Snapshot / Active Notebook / Artifacts if document name is given
    if (!rawUrl && docName && host) {
        if (host.notebookTitle && host.notebookTitle.toLowerCase().includes(docName.toLowerCase())) {
            const content = (host.selection || host.notebookId || 'Notebook Document').slice(0, MAX_DOC_CHARS)
            return {
                ok: true,
                text: `[Document: ${host.notebookTitle}]\n${content}`,
            }
        }
        if (host.notebooks?.length) {
            const matchedNb = host.notebooks.find(
                (nb) =>
                    nb.title.toLowerCase().includes(docName.toLowerCase()) ||
                    nb.id.toLowerCase() === docName.toLowerCase()
            )
            if (matchedNb) {
                const filtered = applyKeywordFilter(
                    matchedNb.content || 'Empty document',
                    filterQuery,
                    `notebook "${matchedNb.title}"`
                )
                if (!filtered.ok) return filtered
                return {
                    ok: true,
                    text: `[Notebook: ${matchedNb.title}]\n${filtered.content.slice(0, MAX_DOC_CHARS)}`,
                }
            }
        }
        if (host.scratchpad?.documents?.length) {
            const matchedScratchDoc = host.scratchpad.documents.find(
                (doc: any) =>
                    doc.name.toLowerCase().includes(docName.toLowerCase()) ||
                    docName.toLowerCase().includes(doc.name.toLowerCase())
            )
            if (matchedScratchDoc) {
                const filtered = applyKeywordFilter(
                    (matchedScratchDoc as any).content || '',
                    filterQuery,
                    `scratchpad document "${matchedScratchDoc.name}"`
                )
                if (!filtered.ok) return filtered
                return {
                    ok: true,
                    text: `[Scratchpad Document: ${matchedScratchDoc.name}]\n${filtered.content.slice(0, MAX_DOC_CHARS)}`,
                }
            }
        }
        if (host.attachments?.length) {
            const matchedAtt = host.attachments.find(
                (att) =>
                    att.name.toLowerCase().includes(docName.toLowerCase()) ||
                    docName.toLowerCase().includes(att.name.toLowerCase())
            )
            if (matchedAtt) {
                const filtered = applyKeywordFilter(
                    matchedAtt.content || '',
                    filterQuery,
                    `attachment "${matchedAtt.name}"`
                )
                if (!filtered.ok) return filtered
                return {
                    ok: true,
                    text: `[Attached Document: ${matchedAtt.name}]\n${filtered.content.slice(0, MAX_DOC_CHARS)}`,
                }
            }
        }
        if (host.artifactId && (host.artifactId.toLowerCase().includes(docName.toLowerCase()) || docName === 'current')) {
            return {
                ok: true,
                text: `[Artifact Document: ${host.artifactTitle || host.artifactId}]\nType: ${host.artifactType || 'document'}`,
            }
        }
        return {
            ok: false,
            error: `Document "${docName}" not found in current workspace. Provide a direct URL or notebook ID.`,
        }
    }

    // 2. Fetch and parse remote URL
    const blocked = isBlockedFetchUrl(rawUrl)
    if (blocked) return { ok: false, error: blocked }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
        const res = await fetch(rawUrl, {
            method: 'GET',
            redirect: 'follow',
            signal: controller.signal,
            headers: {
                'User-Agent': 'WorldInMaking-DocumentReader/1.0',
                Accept: 'application/pdf,text/csv,application/json,text/plain,text/markdown,text/html,*/*',
            },
        })

        if (!res.ok) {
            return { ok: false, error: `document fetch failed (${res.status})` }
        }

        const contentType = (res.headers.get('content-type') || '').toLowerCase()
        const isPdf = rawUrl.toLowerCase().endsWith('.pdf') || contentType.includes('application/pdf')
        const isCsv = rawUrl.toLowerCase().endsWith('.csv') || contentType.includes('text/csv')
        const isJson = rawUrl.toLowerCase().endsWith('.json') || contentType.includes('application/json')

        const arrayBuffer = await res.arrayBuffer()
        const buf = new Uint8Array(arrayBuffer)
        const slice = buf.byteLength > MAX_BYTES ? buf.slice(0, MAX_BYTES) : buf

        let extracted = ''

        if (isPdf) {
            const pages = extractPdfTextFast(slice)
            if (pages.length === 0) {
                return { ok: false, error: 'PDF contained no readable text or is image-only scan' }
            }
            if (targetPage !== undefined) {
                const pageIndex = targetPage - 1
                if (pageIndex < 0 || pageIndex >= pages.length) {
                    return {
                        ok: true,
                        text: `[PDF Document: ${rawUrl} - Total Pages: ${pages.length}]\nPage ${targetPage} is out of range. Showing Page 1:\n${pages[0]}`,
                    }
                }
                return {
                    ok: true,
                    text: `[PDF Document: ${rawUrl} - Page ${targetPage} of ${pages.length}]\n${pages[pageIndex].slice(0, MAX_DOC_CHARS)}`,
                }
            }
            extracted = pages.map((p, idx) => `[Page ${idx + 1}]\n${p}`).join('\n\n')
        } else {
            const decoded = new TextDecoder('utf-8', { fatal: false }).decode(slice)
            if (isCsv) {
                extracted = formatCsvToMarkdown(decoded)
            } else if (isJson) {
                try {
                    const parsed = JSON.parse(decoded)
                    extracted = JSON.stringify(parsed, null, 2)
                } catch {
                    extracted = decoded
                }
            } else {
                extracted = decoded
                    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
                    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
            }
        }

        if (!extracted.trim()) {
            return { ok: false, error: 'document contained no readable text' }
        }

        // Apply keyword filter if requested (fail closed — do not return whole doc as a "match")
        if (filterQuery) {
            const filtered = applyKeywordFilter(extracted, filterQuery, `document ${rawUrl}`)
            if (!filtered.ok) return filtered
            extracted = filtered.content
        }

        const trimmed = extracted.slice(0, MAX_DOC_CHARS)
        return {
            ok: true,
            text: `[Document Content for ${rawUrl}]\n${trimmed}`,
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'read document failed'
        return { ok: false, error: message.slice(0, 180) }
    } finally {
        clearTimeout(timer)
    }
}
