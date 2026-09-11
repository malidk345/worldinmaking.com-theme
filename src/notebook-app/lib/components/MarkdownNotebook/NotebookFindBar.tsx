import { useEffect, useRef } from 'react'
import { ArrowDown, ArrowUp, X } from 'lucide-react'

import { getInlineText } from './utils'
import type { NotebookBlockNode } from './types'

export function notebookNodeSearchText(node: NotebookBlockNode): string {
    if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'blockquote') {
        return getInlineText(node.children)
    }
    if (node.type === 'list') {
        return node.items.map((item) => getInlineText(item.children)).join('\n')
    }
    if (node.type === 'code') {
        return node.text
    }
    if (node.type === 'table') {
        const cells = [...node.headers, ...node.rows.flat()]
        return cells.map((cell) => getInlineText(cell.children)).join(' ')
    }
    if (node.type === 'component') {
        const title = typeof node.props.title === 'string' ? node.props.title : ''
        return `${node.tagName} ${title}`
    }
    return ''
}

export function NotebookFindBar({
    query,
    current,
    total,
    onQueryChange,
    onNext,
    onPrev,
    onClose,
}: {
    query: string
    current: number
    total: number
    onQueryChange: (query: string) => void
    onNext: () => void
    onPrev: () => void
    onClose: () => void
}): JSX.Element {
    const inputRef = useRef<HTMLInputElement | null>(null)

    useEffect(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
    }, [])

    return (
        <div className="MarkdownNotebook__find-bar" role="search" onMouseDown={(event) => event.stopPropagation()}>
            <input
                ref={inputRef}
                type="search"
                value={query}
                placeholder="Find in notebook"
                aria-label="Find in notebook"
                className="MarkdownNotebook__find-input"
                onChange={(event) => onQueryChange(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault()
                        if (event.shiftKey) onPrev()
                        else onNext()
                    }
                    if (event.key === 'Escape') {
                        event.preventDefault()
                        onClose()
                    }
                }}
            />
            <span className="MarkdownNotebook__find-count" aria-live="polite">
                {query.trim() ? (total ? `${current}/${total}` : '0/0') : ''}
            </span>
            <button type="button" className="MarkdownNotebook__find-btn" aria-label="Previous match" onClick={onPrev}>
                <ArrowUp className="size-3.5" />
            </button>
            <button type="button" className="MarkdownNotebook__find-btn" aria-label="Next match" onClick={onNext}>
                <ArrowDown className="size-3.5" />
            </button>
            <button type="button" className="MarkdownNotebook__find-btn" aria-label="Close find" onClick={onClose}>
                <X className="size-3.5" />
            </button>
        </div>
    )
}
