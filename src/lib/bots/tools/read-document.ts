import { isPdfWithoutText, PDF_NO_TEXT, slicePdfByPage } from '../../pdf-pages'
import { isBlockedFetchUrl, assertPublicHostname } from './fetch-url'
import type { HostSnapshot } from './host'

const MAX_BYTES = 500_000
const MAX_DOC_CHARS = 12_000


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

function readLocalDocument(
    content: string,
    label: string,
    targetPage?: number,
    filterQuery?: string
): { ok: true; text: string } | { ok: false; error: string } {
    if (isPdfWithoutText(content)) {
        return { ok: false, error: PDF_NO_TEXT }
    }
    const sliced = slicePdfByPage(content, targetPage)
    if (sliced.error) return { ok: false, error: sliced.error }
    const filtered = applyKeywordFilter(sliced.text, filterQuery || '', label)
    if (!filtered.ok) return filtered
    const head = targetPage
        ? `[${label} — page ${targetPage} of ${sliced.pageCount}]`
        : `[${label}${sliced.pageCount > 1 ? ` — ${sliced.pageCount} pages` : ''}]`
    return { ok: true, text: `${head}\n${filtered.content.slice(0, MAX_DOC_CHARS)}` }
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
                .replace(/\\([nrtbf()\\])/g, (_, esc) => {
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
    host?: HostSnapshot,
    signal?: AbortSignal
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
    if (signal?.aborted) return { ok: false, error: 'client request aborted' }

    const rawUrl = (args.url || '').trim()
    const docName = (args.name || '').trim()
    const targetPage = typeof args.page === 'number' && args.page > 0 ? Math.floor(args.page) : undefined
    const filterQuery = (args.query || '').trim().toLowerCase()

    if (!rawUrl && !docName) {
        const implicit =
            host?.attachments?.[0] ||
            host?.scratchpad?.documents?.find((doc) => doc.content) ||
            host?.scratchpad?.documents?.[0]
        if (implicit?.content) {
            return readLocalDocument(
                implicit.content,
                `Document: ${implicit.name}`,
                targetPage,
                filterQuery
            )
        }
        return { ok: false, error: 'url or document name is required' }
    }

    // 1. Resolve from Host Snapshot / Active Notebook / Artifacts if document name is given
    if (!rawUrl && docName && host) {
        // Bound notebook title match: use selection or notebooks[].content — never the id string.
        if (host.notebookTitle && host.notebookTitle.toLowerCase().includes(docName.toLowerCase())) {
            const bound = host.notebookId
                ? host.notebooks?.find((nb) => nb.id === host.notebookId)
                : undefined
            const content = (host.selection?.trim() || bound?.content || '').trim()
            if (content) {
                const filtered = applyKeywordFilter(
                    content,
                    filterQuery,
                    `notebook "${host.notebookTitle}"`
                )
                if (!filtered.ok) return filtered
                return {
                    ok: true,
                    text: `[Document: ${host.notebookTitle}]\n${filtered.content.slice(0, MAX_DOC_CHARS)}`,
                }
            }
            // No real body yet — fall through to notebooks[] / attachments / fail-closed.
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
                return readLocalDocument(
                    matchedScratchDoc.content || '',
                    `Scratchpad Document: ${matchedScratchDoc.name}`,
                    targetPage,
                    filterQuery
                )
            }
        }
        if (host.attachments?.length) {
            // Explicit name: fail-closed on mismatch (do not silently return the only attachment).
            const matchedAtt = host.attachments.find(
                (att) =>
                    att.name.toLowerCase().includes(docName.toLowerCase()) ||
                    docName.toLowerCase().includes(att.name.toLowerCase())
            )
            if (matchedAtt) {
                return readLocalDocument(
                    matchedAtt.content || '',
                    `Attached Document: ${matchedAtt.name}`,
                    targetPage,
                    filterQuery
                )
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

    // 2. Fetch and parse remote URL (following up to 3 redirects securely)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const onExternalAbort = () => controller.abort()
    signal?.addEventListener('abort', onExternalAbort)

    try {
        if (signal?.aborted) return { ok: false, error: 'client request aborted' }

        let currentUrl = rawUrl
        let res: Response | null = null
        let lastHost = ''
        let isLastIpv4Literal = false

        for (let hop = 0; hop < 4; hop++) {
            if (signal?.aborted) return { ok: false, error: 'client request aborted' }

            const blocked = isBlockedFetchUrl(currentUrl)
            if (blocked) return { ok: false, error: blocked }

            let parsed: URL
            try {
                parsed = new URL(currentUrl)
            } catch {
                return { ok: false, error: 'url is invalid' }
            }
            const parsedHost = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
            const ipv4Literal = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(parsedHost)

            if (!ipv4Literal && !parsedHost.includes(':')) {
                const resolved = await assertPublicHostname(parsedHost, controller.signal)
                if (resolved) return { ok: false, error: resolved }
            }

            lastHost = parsedHost
            isLastIpv4Literal = ipv4Literal

            const hopRes = await fetch(currentUrl, {
                method: 'GET',
                redirect: 'manual',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'WorldInMaking-DocumentReader/1.0',
                    Accept: 'application/pdf,text/csv,application/json,text/plain,text/markdown,text/html,*/*',
                },
            })

            if (hopRes.status >= 300 && hopRes.status < 400) {
                const location = hopRes.headers.get('location')
                if (!location) {
                    return { ok: false, error: `document fetch failed (${hopRes.status})` }
                }
                currentUrl = new URL(location, currentUrl).href
                continue
            }

            res = hopRes
            break
        }

        if (!res) {
            return { ok: false, error: 'too many redirects' }
        }

        if (!res.ok) {
            return { ok: false, error: `document fetch failed (${res.status})` }
        }

        if (!isLastIpv4Literal && !lastHost.includes(':')) {
            const rebound = await assertPublicHostname(lastHost, controller.signal)
            if (rebound) return { ok: false, error: rebound }
        }

        const contentType = (res.headers.get('content-type') || '').toLowerCase()
        const isPdf = currentUrl.toLowerCase().endsWith('.pdf') || contentType.includes('application/pdf')
        const isCsv = currentUrl.toLowerCase().endsWith('.csv') || contentType.includes('text/csv')
        const isJson = currentUrl.toLowerCase().endsWith('.json') || contentType.includes('application/json')

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
                        ok: false,
                        error: `Page ${targetPage} is out of range (${pages.length} page${pages.length === 1 ? '' : 's'} in this extract).`,
                    }
                }
                return {
                    ok: true,
                    text: `[PDF Document: ${rawUrl} — page ${targetPage} of ${pages.length}]\n${pages[pageIndex].slice(0, MAX_DOC_CHARS)}`,
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

        if (!extracted.trim() || isPdfWithoutText(extracted)) {
            return { ok: false, error: isPdf ? PDF_NO_TEXT : 'document contained no readable text' }
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
        if (signal?.aborted) {
            return { ok: false, error: 'client request aborted' }
        }
        const message = error instanceof Error ? error.message : 'read document failed'
        return { ok: false, error: message.slice(0, 180) }
    } finally {
        clearTimeout(timer)
        signal?.removeEventListener('abort', onExternalAbort)
    }
}
