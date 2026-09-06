import clsx from 'clsx'
import { type CSSProperties, useEffect, useRef, useState } from 'react'

import OSButton from 'components/OSButton'
import { MAX_INVITE_BOTS, NOTEBOOK_INVITE_BOT_IDS, resolveInviteBot } from '../../../../lib/bots/notebook-invite'

import { InsertMenuPosition } from './editorTypes'

export function InvitePhilosopherPicker({
    position,
    onConfirm,
    onClose,
}: {
    position: InsertMenuPosition | null
    onConfirm: (botIds: string[]) => void
    onClose: () => void
}): JSX.Element {
    const [selected, setSelected] = useState<string[]>([])
    const rootRef = useRef<HTMLDivElement | null>(null)

    const toggle = (id: string): void => {
        setSelected((current) => {
            if (current.includes(id)) return current.filter((entry) => entry !== id)
            if (current.length >= MAX_INVITE_BOTS) return [...current.slice(1), id]
            return [...current, id]
        })
    }

    useEffect(() => {
        rootRef.current?.focus()
    }, [])

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent): void => {
            if (!(event.target instanceof Node)) return
            if (rootRef.current?.contains(event.target)) return
            onClose()
        }
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                onClose()
            }
        }
        window.document.addEventListener('mousedown', handlePointerDown)
        window.document.addEventListener('keydown', handleKeyDown, true)
        return () => {
            window.document.removeEventListener('mousedown', handlePointerDown)
            window.document.removeEventListener('keydown', handleKeyDown, true)
        }
    }, [onClose])

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
                position && 'MarkdownNotebook__invite-picker--positioned',
                position && `MarkdownNotebook__invite-picker--${position.placement}`
            )}
            contentEditable={false}
            role="dialog"
            aria-label="Invite philosophers"
            tabIndex={-1}
            style={menuStyle}
        >
            <div className="MarkdownNotebook__invite-picker-head">
                <h5>Invite</h5>
                <span>{selected.length ? `${selected.length} selected` : `Pick 1–${MAX_INVITE_BOTS}`}</span>
            </div>
            <div className="MarkdownNotebook__invite-picker-grid">
                {NOTEBOOK_INVITE_BOT_IDS.map((botId) => {
                    const bot = resolveInviteBot(botId)
                    if (!bot) return null
                    const active = selected.includes(bot.id)
                    const order = selected.indexOf(bot.id)
                    return (
                        <button
                            key={bot.id}
                            type="button"
                            className={clsx(
                                'MarkdownNotebook__invite-picker-item',
                                active && 'MarkdownNotebook__invite-picker-item--active'
                            )}
                            aria-pressed={active}
                            onClick={() => toggle(bot.id)}
                        >
                            <span className="MarkdownNotebook__invite-picker-mark" aria-hidden="true">
                                {bot.avatarUrl ? (
                                    <img src={bot.avatarUrl} alt="" />
                                ) : (
                                    bot.name.charAt(0)
                                )}
                                {active ? <em>{order + 1}</em> : null}
                            </span>
                            <span className="MarkdownNotebook__invite-picker-copy">
                                <span className="MarkdownNotebook__invite-picker-name">{bot.name}</span>
                                <span className="MarkdownNotebook__invite-picker-stance">{bot.shortStance}</span>
                            </span>
                        </button>
                    )
                })}
            </div>
            <div className="MarkdownNotebook__invite-picker-actions">
                <OSButton size="xs" onClick={onClose}>
                    Cancel
                </OSButton>
                <OSButton
                    size="xs"
                    variant="primary"
                    disabled={selected.length < 1 || selected.length > MAX_INVITE_BOTS}
                    onClick={() => {
                        if (selected.length >= 1 && selected.length <= MAX_INVITE_BOTS) onConfirm(selected)
                    }}
                >
                    Invite
                </OSButton>
            </div>
        </div>
    )
}
