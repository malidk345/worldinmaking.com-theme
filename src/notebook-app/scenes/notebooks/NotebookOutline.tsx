import { useMemo } from 'react'
import { extractOutlineHeadings, scrollToNotebookNode, type OutlineHeading } from './outlineModel'

interface NotebookOutlineProps {
    markdown: string
    /** Optional container that holds the notebook (for scoped query). */
    containerRef?: React.RefObject<HTMLElement | null>
    className?: string
    /** Called after a heading jump (e.g. close the mobile drawer). */
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
            <h4 className="font-semibold text-muted m-0 mb-1 text-sm">Jump to:</h4>
            {headings.length === 0 ? (
                <p className="text-sm text-muted m-0 leading-snug">
                    Add headings (H1–H3) to build an outline for this notebook.
                </p>
            ) : (
                <ul className="list-none m-0 p-0 flex flex-col">
                    {headings.map((heading) => (
                        <li className="relative leading-none m-0" key={heading.id}>
                            <button
                                type="button"
                                onClick={() => handleClick(heading)}
                                className="hover:underline text-left w-full text-sm text-primary py-1 bg-transparent border-0 cursor-pointer"
                                style={{ paddingLeft: `${heading.level - 1}rem` }}
                                title={heading.text}
                            >
                                {heading.text}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
