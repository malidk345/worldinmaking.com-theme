/**
 * Reasoning wrapper grammar shared by the provider stream and public-reply
 * parser. This module routes existing thinking content; it does not rewrite
 * or summarize the thinking experience.
 */
export const THINKING_TAG_NAMES = [
    'analysis_summary',
    'thinking',
    'think',
    'thought',
    'reasoning',
    'analysis',
    'reflection',
    'internal',
    'goal',
    'approach',
    'tradeoff',
    'answer_plan',
    'perceive',
    'frame',
    'tension',
    'move',
    'structure',
    'genealogy',
    'deconstruction',
    'overcoming',
    'materialist_basis',
    'dialectical_tension',
    'praxis',
    'substance_analysis',
    'affect_mapping',
    'rational_intuition',
    'negative_dialectics',
    'immanent_critique',
    'resolution',
] as const

const TAG_NAMES = THINKING_TAG_NAMES.join('|')
const OPEN_TAG_PATTERN = new RegExp(`<(${TAG_NAMES})(?:\\s[^>]*)?>`, 'i')
const CLOSE_TAG_PATTERN = new RegExp(`</(${TAG_NAMES})(?:\\s[^>]*)?>`, 'i')
const COMPLETE_BLOCK_PATTERN = new RegExp(`<(${TAG_NAMES})(?:\\s[^>]*)?>[\\s\\S]*?</\\1\\s*>`, 'gi')
const UNCLOSED_BLOCK_PATTERN = new RegExp(`<(${TAG_NAMES})(?:\\s[^>]*)?>[\\s\\S]*$`, 'gi')
const TAG_PATTERN = new RegExp(`</?(?:${TAG_NAMES})(?:\\s[^>]*)?>`, 'gi')
const MAX_PARTIAL_TAG_LENGTH = 96

export interface ThinkingTagMatch {
    index: number
    length: number
    tagName: string
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function findThinkingOpen(value: string): ThinkingTagMatch | null {
    const match = OPEN_TAG_PATTERN.exec(value)
    return match && match.index !== undefined
        ? { index: match.index, length: match[0].length, tagName: match[1].toLowerCase() }
        : null
}

export function findThinkingClose(value: string, expectedTagName?: string): ThinkingTagMatch | null {
    const pattern = expectedTagName
        ? new RegExp(`</${escapeRegExp(expectedTagName)}\\s*>`, 'i')
        : CLOSE_TAG_PATTERN
    const match = pattern.exec(value)
    return match && match.index !== undefined
        ? {
              index: match.index,
              length: match[0].length,
              tagName: expectedTagName?.toLowerCase() || match[1].toLowerCase(),
          }
        : null
}

function partialTagIndex(value: string, closing: boolean): number {
    const marker = value.lastIndexOf(closing ? '</' : '<')
    if (marker < 0) return -1

    const partial = value.slice(marker).toLowerCase()
    if (partial.includes('>')) return -1

    const prefix = closing ? '</' : '<'
    return THINKING_TAG_NAMES.some((tag) => {
        const tagPrefix = `${prefix}${tag}`
        return tagPrefix.startsWith(partial) || partial.startsWith(tagPrefix)
    })
        ? marker
        : -1
}

function hasPartialTagSuffix(value: string, closing: boolean): boolean {
    return partialTagIndex(value.slice(-MAX_PARTIAL_TAG_LENGTH), closing) >= 0
}

function stripPartialTag(value: string, closing: boolean): string {
    const index = partialTagIndex(value, closing)
    return index >= 0 ? value.slice(0, index) : value
}

/** Removes reasoning blocks from a public reply after the stream is complete. */
export function stripThinkingBlocks(value: string): string {
    if (!value) return ''

    let cleaned = value
        .replace(COMPLETE_BLOCK_PATTERN, '')
        .replace(UNCLOSED_BLOCK_PATTERN, '')
        .replace(TAG_PATTERN, '')
    cleaned = stripPartialTag(cleaned, false)
    cleaned = stripPartialTag(cleaned, true)
    return cleaned.trim()
}

export type ThinkingStreamSink = (text: string) => void

/**
 * Incrementally separates model output into public and thinking channels.
 * Partial opening/closing tags remain buffered until the next provider chunk.
 */
export class ThinkingStreamDemux {
    private buffer = ''
    private activeTagName: string | null = null

    push(chunk: string, onPublic: ThinkingStreamSink, onThinking: ThinkingStreamSink): void {
        if (!chunk) return
        this.buffer += chunk
        this.drain(onPublic, onThinking)
    }

    finish(onPublic: ThinkingStreamSink, onThinking: ThinkingStreamSink): void {
        this.drain(onPublic, onThinking)
        if (!this.buffer) return

        if (this.activeTagName) {
            onThinking(this.buffer)
        } else if (hasPartialTagSuffix(this.buffer, false) || hasPartialTagSuffix(this.buffer, true)) {
            const markerStart = this.buffer.lastIndexOf('<')
            if (markerStart > 0) onPublic(this.buffer.slice(0, markerStart))
        } else {
            onPublic(this.buffer)
        }

        this.buffer = ''
    }

    private drain(onPublic: ThinkingStreamSink, onThinking: ThinkingStreamSink): void {
        while (this.buffer.length > 0) {
            if (!this.activeTagName) {
                const opening = findThinkingOpen(this.buffer)
                if (opening) {
                    if (opening.index > 0) onPublic(this.buffer.slice(0, opening.index))
                    this.activeTagName = opening.tagName
                    this.buffer = this.buffer.slice(opening.index + opening.length)
                    continue
                }

                const strayClosing = findThinkingClose(this.buffer)
                if (strayClosing) {
                    // Text before a lone </think> is leftover reasoning, not the public answer.
                    if (strayClosing.index > 0) onThinking(this.buffer.slice(0, strayClosing.index))
                    this.buffer = this.buffer.slice(strayClosing.index + strayClosing.length)
                    continue
                }

                // A split </think> is still arriving. Hold the whole head so the
                // prefix is not flushed as public and then reclassified too late.
                if (hasPartialTagSuffix(this.buffer, true)) return

                const safeFlushLength = this.findSafeFlushLength(false)
                if (safeFlushLength > 0) {
                    onPublic(this.buffer.slice(0, safeFlushLength))
                    this.buffer = this.buffer.slice(safeFlushLength)
                    continue
                }
                return
            }

            const closing = findThinkingClose(this.buffer, this.activeTagName)
            if (closing) {
                if (closing.index > 0) onThinking(this.buffer.slice(0, closing.index))
                this.activeTagName = null
                this.buffer = this.buffer.slice(closing.index + closing.length)
                continue
            }

            const safeFlushLength = this.findSafeFlushLength(true)
            if (safeFlushLength > 0) {
                onThinking(this.buffer.slice(0, safeFlushLength))
                this.buffer = this.buffer.slice(safeFlushLength)
                continue
            }
            return
        }
    }

    private findSafeFlushLength(closing: boolean): number {
        const start = Math.max(0, this.buffer.length - MAX_PARTIAL_TAG_LENGTH)
        for (let index = start; index < this.buffer.length; index += 1) {
            const suffix = this.buffer.slice(index)
            if (hasPartialTagSuffix(suffix, closing) || (!closing && hasPartialTagSuffix(suffix, true))) return index
        }
        return this.buffer.length
    }
}
