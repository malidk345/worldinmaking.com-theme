import { useMemo } from 'react'
import OSButton from 'components/OSButton'
import { extractOutlineHeadings, scrollToNotebookNode, type OutlineHeading } from './outlineModel'

interface NotebookOutlineProps {
    markdown: string
    containerRef?: React.RefObject<HTMLElement | null>
    className?: string
    onNavigate?: () => void
}

export function NotebookOutline({
    markdown,
    containerRef,
    className = '',
    onNavigate,
}: NotebookOutlineProps): JSX.Element {
    const headings = useMemo(() => extractOutlineHeadings(markdown), [markdown])

    const handleClick = (heading: OutlineHeading) => {
        const root = containerRef?.current ?? null
        scrollToNotebookNode(heading.id, root)
        onNavigate?.()
    }

    return (
        <div className={`not-prose ${className}`}>
            <h4 className="font-semibold text-muted m-0 mb-1 px-1 text-sm">On this page</h4>
            {headings.length === 0 ? (
                <p className="text-sm text-muted m-0 px-1 leading-snug">
                    Add headings (H1–H3) to build an outline for this notebook.
                </p>
            ) : (
                <div className="flex flex-col gap-px">
                    {headings.map((heading) => (
                        <OSButton
                            key={heading.id}
                            type="button"
                            align="left"
                            width="full"
                            size="md"
                            hover="background"
                            onClick={() => handleClick(heading)}
                            className="!items-start"
                        >
                            <span
                                data-sidebar-label
                                className="block min-w-0 truncate"
                                style={{ paddingLeft: `${Math.max(0, heading.level - 1) * 0.75}rem` }}
                                title={heading.text}
                            >
                                {heading.text}
                            </span>
                        </OSButton>
                    ))}
                </div>
            )}
        </div>
    )
}
