import { useMemo } from 'react'
import { IconList } from '@posthog/icons'
import { extractOutlineHeadings, scrollToNotebookNode, type OutlineHeading } from './outlineModel'

interface NotebookOutlineProps {
    markdown: string
    /** Optional container that holds the notebook (for scoped query). */
    containerRef?: React.RefObject<HTMLElement | null>
    className?: string
}

function padClass(level: 1 | 2 | 3): string {
    if (level === 1) return 'pl-2'
    if (level === 2) return 'pl-4'
    return 'pl-6'
}

function textClass(level: 1 | 2 | 3): string {
    if (level === 1) return 'font-semibold text-primary'
    if (level === 2) return 'font-medium text-primary'
    return 'text-secondary'
}

export function NotebookOutline({ markdown, containerRef, className = '' }: NotebookOutlineProps): JSX.Element | null {
    const headings = useMemo(() => extractOutlineHeadings(markdown), [markdown])

    if (headings.length === 0) {
        return (
            <aside
                className={`notebook-outline hidden lg:flex flex-col w-52 shrink-0 sticky top-3 self-start max-h-[min(70vh,32rem)] border border-border rounded-lg bg-[var(--color-bg-surface-primary,#fff)] p-3 ${className}`}
            >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                    <IconList className="w-3.5 h-3.5" />
                    Outline
                </div>
                <p className="text-xs text-muted m-0 leading-snug">
                    Add headings (H1–H3) to build an outline for this notebook.
                </p>
            </aside>
        )
    }

    const handleClick = (heading: OutlineHeading) => {
        const root = containerRef?.current ?? null
        scrollToNotebookNode(heading.id, root)
    }

    return (
        <aside
            className={`notebook-outline hidden lg:flex flex-col w-52 shrink-0 sticky top-3 self-start max-h-[min(70vh,32rem)] border border-border rounded-lg bg-[var(--color-bg-surface-primary,#fff)] p-2 ${className}`}
            aria-label="Notebook outline"
        >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-wide px-1.5 py-1 mb-1">
                <IconList className="w-3.5 h-3.5" />
                Outline
                <span className="ml-auto font-normal normal-case tabular-nums">{headings.length}</span>
            </div>

            <nav className="overflow-y-auto overscroll-contain flex-1 min-h-0 space-y-0.5 pr-0.5">
                {headings.map((h) => (
                    <button
                        key={h.id}
                        type="button"
                        onClick={() => handleClick(h)}
                        className={`w-full text-left text-xs leading-snug py-1 pr-1.5 rounded border border-transparent hover:bg-surface-secondary hover:border-border transition-colors truncate ${padClass(
                            h.level
                        )} ${textClass(h.level)}`}
                        title={h.text}
                    >
                        {h.text}
                    </button>
                ))}
            </nav>
        </aside>
    )
}
