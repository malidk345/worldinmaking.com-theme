import clsx from 'clsx'
import { type CSSProperties, useEffect, useRef, useState } from 'react'

import { InsertMenuPosition } from './editorTypes'
import type { MentionPerson } from './mentionPeople'

export function MentionPicker({
    people,
    query,
    position,
    onPick,
    onClose,
}: {
    people: MentionPerson[]
    query: string
    position: InsertMenuPosition | null
    onPick: (person: MentionPerson) => void
    onClose: () => void
}): JSX.Element {
    const rootRef = useRef<HTMLDivElement | null>(null)
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => {
        setSelectedIndex(0)
    }, [query, people.length])

    useEffect(() => {
        const onPointerDown = (event: MouseEvent): void => {
            if (!(event.target instanceof Node)) return
            if (rootRef.current?.contains(event.target)) return
            onClose()
        }
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                onClose()
                return
            }
            if (!people.length) return
            if (event.key === 'ArrowDown') {
                event.preventDefault()
                event.stopPropagation()
                setSelectedIndex((index) => (index + 1) % people.length)
                return
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault()
                event.stopPropagation()
                setSelectedIndex((index) => (index - 1 + people.length) % people.length)
                return
            }
            if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) {
                event.preventDefault()
                event.stopPropagation()
                onPick(people[selectedIndex] || people[0])
            }
        }
        window.document.addEventListener('mousedown', onPointerDown)
        window.document.addEventListener('keydown', onKeyDown, true)
        return () => {
            window.document.removeEventListener('mousedown', onPointerDown)
            window.document.removeEventListener('keydown', onKeyDown, true)
        }
    }, [onClose, onPick, people, selectedIndex])

    const menuStyle = position
        ? ({
              '--markdown-notebook-invite-picker-left': `${position.left}px`,
              '--markdown-notebook-invite-picker-max-height': `${position.maxHeight}px`,
              '--markdown-notebook-invite-picker-top': `${position.top}px`,
              '--markdown-notebook-invite-picker-width': `${position.width}px`,
          } as CSSProperties)
        : undefined

    return (
        <div
            ref={rootRef}
            className={clsx(
                'MarkdownNotebook__invite-picker',
                'MarkdownNotebook__mention-picker',
                position && 'MarkdownNotebook__invite-picker--positioned',
                position && `MarkdownNotebook__invite-picker--${position.placement}`
            )}
            contentEditable={false}
            role="listbox"
            aria-label="Mention"
            aria-activedescendant={people[selectedIndex] ? `notebook-mention-${people[selectedIndex].id}` : undefined}
            tabIndex={-1}
            style={menuStyle}
        >
            <div className="MarkdownNotebook__invite-picker-head">
                <h5>Mention</h5>
                <span>{query ? `@${query}` : 'People on this page'}</span>
            </div>
            <div className="MarkdownNotebook__invite-picker-grid">
                {people.length ? (
                    people.map((person, index) => (
                        <button
                            key={person.id}
                            id={`notebook-mention-${person.id}`}
                            type="button"
                            role="option"
                            aria-selected={index === selectedIndex}
                            className={clsx(
                                'MarkdownNotebook__invite-picker-item',
                                index === selectedIndex && 'bg-accent'
                            )}
                            onMouseEnter={() => setSelectedIndex(index)}
                            onClick={() => onPick(person)}
                        >
                            <span className="MarkdownNotebook__invite-picker-mark" aria-hidden="true">
                                {person.avatar ? <img src={person.avatar} alt="" /> : person.label.charAt(0)}
                            </span>
                            <span className="MarkdownNotebook__invite-picker-copy">
                                <span className="MarkdownNotebook__invite-picker-name">{person.label}</span>
                            </span>
                        </button>
                    ))
                ) : (
                    <p className="MarkdownNotebook__mention-picker-empty">No match</p>
                )}
            </div>
        </div>
    )
}
