/**
 * Document Parser — WorldInMaking Enterprise AI Workstation
 *
 * Extracts structured text, sections, tables, and metadata from uploaded
 * documents (Markdown, Plain Text, CSV, JSON, and PDF text extractions).
 */

export interface ParsedDocumentSection {
    heading?: string
    content: string
    pageNumber?: number
    index: number
}

export interface ParsedDocument {
    id: string
    filename: string
    fileType: 'markdown' | 'text' | 'csv' | 'json' | 'pdf' | 'other'
    sizeBytes: number
    totalWordCount: number
    sections: ParsedDocumentSection[]
    rawText: string
    uploadedAt: string
}

/**
 * Extracts plain text & structured sections from raw text content based on file type.
 */
export function parseDocumentContent(
    filename: string,
    content: string,
    fileTypeHint?: string
): ParsedDocument {
    const rawText = String(content || '').trim()
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    
    let fileType: ParsedDocument['fileType'] = 'text'
    if (ext === 'md' || ext === 'markdown' || fileTypeHint?.includes('markdown')) {
        fileType = 'markdown'
    } else if (ext === 'csv' || fileTypeHint?.includes('csv')) {
        fileType = 'csv'
    } else if (ext === 'json' || fileTypeHint?.includes('json')) {
        fileType = 'json'
    } else if (ext === 'pdf' || fileTypeHint?.includes('pdf')) {
        fileType = 'pdf'
    }

    const sections: ParsedDocumentSection[] = []
    const words = rawText.split(/\s+/).filter(Boolean).length

    if (fileType === 'markdown' || fileType === 'pdf') {
        const lines = rawText.split('\n')
        let currentHeading = 'Introduction'
        let currentLines: string[] = []
        let sectionIndex = 0

        const flush = () => {
            const text = currentLines.join('\n').trim()
            if (text.length > 0) {
                sections.push({
                    heading: currentHeading,
                    content: text,
                    index: sectionIndex++,
                })
            }
            currentLines = []
        }

        for (const line of lines) {
            const hMatch = line.match(/^(#{1,4})\s+(.+)$/)
            if (hMatch) {
                flush()
                currentHeading = hMatch[2].trim()
                continue
            }
            // PDF Page boundary marker detection e.g. "--- Page 2 ---"
            const pageMatch = line.match(/^---\s*(?:Page|Sayfa)\s*(\d+)\s*---$/i)
            if (pageMatch) {
                flush()
                currentHeading = `Page ${pageMatch[1]}`
                continue
            }
            currentLines.push(line)
        }
        flush()
    } else if (fileType === 'csv') {
        // Break CSV into structured chunks of 20 rows
        const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
        const header = lines[0] || 'Data'
        const chunkSize = 20
        for (let i = 1; i < lines.length; i += chunkSize) {
            const slice = lines.slice(i, i + chunkSize)
            sections.push({
                heading: `Rows ${i} - ${Math.min(i + chunkSize - 1, lines.length - 1)}`,
                content: `${header}\n${slice.join('\n')}`,
                index: sections.length,
            })
        }
    } else {
        // Plain text / other: Split into ~1200 character paragraphs
        const paragraphs = rawText.split(/\n\s*\n/)
        paragraphs.forEach((p, idx) => {
            const trimmed = p.trim()
            if (trimmed.length > 0) {
                sections.push({
                    heading: `Section ${idx + 1}`,
                    content: trimmed,
                    index: idx,
                })
            }
        })
    }

    // Fallback if no sections were created
    if (sections.length === 0 && rawText.length > 0) {
        sections.push({
            heading: filename,
            content: rawText,
            index: 0,
        })
    }

    return {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        filename,
        fileType,
        sizeBytes: typeof Blob !== 'undefined' ? new Blob([rawText]).size : rawText.length,
        totalWordCount: words,
        sections,
        rawText,
        uploadedAt: new Date().toISOString(),
    }
}
