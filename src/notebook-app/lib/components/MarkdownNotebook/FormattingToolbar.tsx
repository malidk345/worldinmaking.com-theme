import clsx from 'clsx'
import {
    KeyboardEvent as ReactKeyboardEvent,
    type CSSProperties,
    type ReactNode,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react'

import {
    IconCheck,
    IconChevronDown,
    IconCode,
    IconComment,
    IconCopy,
    IconExternal,
    IconPencil,
    IconQuote,
    IconSparkles,
} from '@posthog/icons'
import {
    IconBold,
    IconIndent,
    IconItalic,
    IconLink,
    IconOutdent,
    IconStrikethrough,
} from '../../icons/iconsShim'

function FormatBtn({
    active,
    disabled,
    label,
    className,
    onClick,
    children,
}: {
    active?: boolean
    disabled?: boolean
    label: string
    className?: string
    onClick: () => void
    children: ReactNode
}): JSX.Element {
    return (
        <button
            type="button"
            className={clsx(
                'MarkdownNotebook__format-btn',
                active && 'MarkdownNotebook__format-btn--active',
                className
            )}
            title={label}
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            onPointerDown={(event) => {
                event.preventDefault()
            }}
            onClick={onClick}
        >
            {children}
        </button>
    )
}

import {
    FloatingToolbarCodeRange,
    FloatingToolbarListItemRange,
    FloatingToolbarState,
    FloatingToolbarTextRange,
    TextBlockStyle,
} from './editorTypes'
import { getSelectedLinkHref } from './inlineContent'
import { sanitizeNotebookLinkHref } from './markdown'
import { NotebookInlineMark, NotebookTextBlockNode } from './types'

export const TEXT_BLOCK_STYLE_BUTTONS: {
    style: TextBlockStyle
    label: string
    content?: string
    icon?: JSX.Element
}[] = [
    { style: 'paragraph', label: 'Text', content: 'Text' },
    { style: 1, label: 'Heading 1', content: 'H1' },
    { style: 2, label: 'Heading 2', content: 'H2' },
    { style: 3, label: 'Heading 3', content: 'H3' },
    { style: 'blockquote', label: 'Quote', icon: <IconQuote /> },
    { style: 'code', label: 'Code', icon: <IconCode /> },
]

export function FormattingToolbar({
    selectedBlockStyle,
    selectedBlockQuoted,
    placement,
    top,
    left,
    showInlineActions,
    activeMarks,
    applyInlineMark,
    applyInlineLink,
    currentLinkHref,
    initialLinkEditorOpen,
    setBlockStyle,
    copySelection,
    askAIAboutSelection,
    selectionAIActions,
    isAskAIDisabled,
    startInlineCommentAtSelection,
    lockPosition,
    returnFocusToEditor,
    docked,
    onIndent,
    onOutdent,
    canIndent,
    canOutdent,
}: {
    selectedBlockStyle: TextBlockStyle | null
    /** Whether every selected block sits inside a blockquote — orthogonal to the text style. */
    selectedBlockQuoted: boolean
    placement: 'above' | 'below'
    top: number
    left: number
    showInlineActions: boolean
    activeMarks?: {
        bold?: boolean
        italic?: boolean
        underline?: boolean
        strike?: boolean
        code?: boolean
    }
    applyInlineMark: (markType: NotebookInlineMark['type']) => void
    applyInlineLink: (href: string | null) => void
    currentLinkHref: string | null
    initialLinkEditorOpen: boolean
    setBlockStyle: (style: TextBlockStyle) => void
    copySelection: () => void
    /** Freeform Ask AI (opens inline prompt). Optional `presetQuery` auto-runs. */
    askAIAboutSelection?: (presetQuery?: string) => void
    /** Quick actions shown next to Ask AI when selection is non-empty. */
    selectionAIActions?: Array<{ id: string; label: string; tooltip: string; prompt: string }>
    isAskAIDisabled?: boolean
    startInlineCommentAtSelection?: () => void
    lockPosition: () => void
    /** Moves focus back into the editor (Escape while the toolbar holds focus). */
    returnFocusToEditor?: () => void
    docked?: boolean
    onIndent?: () => void
    onOutdent?: () => void
    canIndent?: boolean
    canOutdent?: boolean
}): JSX.Element {
    const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false)
    const [isLinkEditorOpen, setIsLinkEditorOpen] = useState(initialLinkEditorOpen || !!currentLinkHref)
    const [shouldFocusLinkInput, setShouldFocusLinkInput] = useState(initialLinkEditorOpen)
    const [linkHref, setLinkHref] = useState(currentLinkHref ?? '')
    const toolbarRef = useRef<HTMLDivElement | null>(null)
    const styleMenuRef = useRef<HTMLDivElement | null>(null)
    const linkInputRef = useRef<HTMLInputElement | null>(null)
    const [boundsShift, setBoundsShift] = useState({ x: 0, y: 0 })

    // The anchor point only clamps the toolbar's center to the viewport, so the rendered toolbar
    // (translated -50% horizontally, and -100% when placed above) can still poke past the edges.
    // Measure the real box and shift it back inside.
    useLayoutEffect(() => {
        if (docked) {
            if (boundsShift.x || boundsShift.y) setBoundsShift({ x: 0, y: 0 })
            return
        }
        const element = toolbarRef.current
        if (!element) {
            return
        }

        const rect = element.getBoundingClientRect()
        if (!rect.width && !rect.height) {
            return
        }

        const margin = 8
        const vv = window.visualViewport
        const viewLeft = vv?.offsetLeft ?? 0
        const viewTop = vv?.offsetTop ?? 0
        const viewRight = viewLeft + (vv?.width ?? window.innerWidth)
        const viewBottom = viewTop + (vv?.height ?? window.innerHeight)
        const baseLeft = rect.left - boundsShift.x
        const baseTop = rect.top - boundsShift.y
        let x = 0
        if (baseLeft + rect.width > viewRight - margin) {
            x = viewRight - margin - rect.width - baseLeft
        }
        if (baseLeft + x < viewLeft + margin) {
            x = viewLeft + margin - baseLeft
        }
        let y = 0
        if (baseTop + rect.height > viewBottom - margin) {
            y = viewBottom - margin - rect.height - baseTop
        }
        if (baseTop + y < viewTop + margin) {
            y = viewTop + margin - baseTop
        }

        x = Math.round(x)
        y = Math.round(y)
        if (x !== boundsShift.x || y !== boundsShift.y) {
            setBoundsShift({ x, y })
        }
    }, [top, left, placement, isLinkEditorOpen, showInlineActions, boundsShift, docked])

    const toolbarStyle = {
        '--markdown-notebook-format-toolbar-top': `${top}px`,
        '--markdown-notebook-format-toolbar-left': `${left}px`,
        '--markdown-notebook-format-toolbar-shift-x': `${boundsShift.x}px`,
        '--markdown-notebook-format-toolbar-shift-y': `${boundsShift.y}px`,
    } as CSSProperties
    const normalizedLinkHref = sanitizeNotebookLinkHref(linkHref)
    const hasExistingLink = !!currentLinkHref

    // Selecting linked text opens the URL editor right away (no extra click), but without
    // stealing focus from the selection: the input only autofocuses on an explicit open.
    useEffect(() => {
        if (initialLinkEditorOpen || currentLinkHref) {
            setLinkHref(currentLinkHref ?? '')
            setIsLinkEditorOpen(true)
            if (initialLinkEditorOpen) {
                setShouldFocusLinkInput(true)
            }
            return
        }

        setIsLinkEditorOpen(false)
        setShouldFocusLinkInput(false)
        setLinkHref('')
    }, [currentLinkHref, initialLinkEditorOpen])

    const openLinkEditor = (): void => {
        setLinkHref(currentLinkHref ?? '')
        setIsLinkEditorOpen(true)
        setShouldFocusLinkInput(true)
        linkInputRef.current?.focus()
    }

    const setLink = (): void => {
        if (!normalizedLinkHref) {
            return
        }

        applyInlineLink(normalizedLinkHref)
        setIsLinkEditorOpen(false)
    }

    const removeLink = (): void => {
        applyInlineLink(null)
        setIsLinkEditorOpen(false)
    }

    useEffect(() => {
        if (!isStyleMenuOpen) return
        const handleClickOutside = (e: MouseEvent | TouchEvent): void => {
            if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
                setIsStyleMenuOpen(false)
            }
        }
        window.addEventListener('mousedown', handleClickOutside, true)
        window.addEventListener('touchstart', handleClickOutside, true)
        return () => {
            window.removeEventListener('mousedown', handleClickOutside, true)
            window.removeEventListener('touchstart', handleClickOutside, true)
        }
    }, [isStyleMenuOpen])

    // Roving arrow-key navigation between the toolbar's buttons; Escape hands focus back to
    // the editor. The buttons stay in the tab order, so this only augments focus movement.
    const handleToolbarKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
        if (event.target instanceof HTMLElement && event.target.closest('.MarkdownNotebook__format-link-editor')) {
            if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                setIsLinkEditorOpen(false)
            }
            return
        }

        if (event.key === 'Escape') {
            if (isStyleMenuOpen) {
                event.preventDefault()
                event.stopPropagation()
                setIsStyleMenuOpen(false)
                return
            }
            event.preventDefault()
            event.stopPropagation()
            returnFocusToEditor?.()
            return
        }

        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
            return
        }

        const toolbarElement = toolbarRef.current
        if (!toolbarElement) {
            return
        }

        const buttons = Array.from(toolbarElement.querySelectorAll<HTMLButtonElement>('button:not([disabled])'))
        if (!buttons.length) {
            return
        }

        const activeIndex = buttons.findIndex((button) => button === window.document.activeElement)
        if (activeIndex === -1) {
            return
        }

        event.preventDefault()
        event.stopPropagation()
        const nextIndex =
            event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? buttons.length - 1
                  : (activeIndex + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length
        buttons[nextIndex].focus()
    }

    return (
        <div
            className={clsx(
                'MarkdownNotebook__format-toolbar',
                `MarkdownNotebook__format-toolbar--${placement}`,
                docked && 'MarkdownNotebook__format-toolbar--docked'
            )}
            contentEditable={false}
            ref={toolbarRef}
            style={toolbarStyle}
            role="toolbar"
            aria-label="Text formatting"
            aria-orientation="horizontal"
            aria-keyshortcuts="Alt+F10"
            onKeyDown={handleToolbarKeyDown}
            onFocusCapture={lockPosition}
            onPointerDownCapture={(event) => {
                lockPosition()
                if (
                    event.target instanceof HTMLElement &&
                    event.target.closest('input, textarea')
                ) {
                    return
                }
                event.preventDefault()
            }}
            onTouchStartCapture={lockPosition}
            onMouseDown={(event) => {
                lockPosition()
                if (
                    event.target instanceof HTMLElement &&
                    (event.target.closest('.MarkdownNotebook__format-link-editor') ||
                        event.target.closest('.MarkdownNotebook__format-style-dropdown'))
                ) {
                    return
                }
                event.preventDefault()
            }}
        >
            {/* 1. Style Dropdown (Craft: [ ✏️ ▾ ]) */}
            <div className="relative inline-flex items-center">
                <FormatBtn
                    label="Change text style"
                    active={isStyleMenuOpen || selectedBlockQuoted || (selectedBlockStyle !== null && selectedBlockStyle !== 'paragraph')}
                    className="MarkdownNotebook__format-btn--style"
                    onClick={() => setIsStyleMenuOpen((prev) => !prev)}
                >
                    <IconPencil className="size-3.5" />
                    <IconChevronDown className="size-2.5 opacity-70 ml-0.5" />
                </FormatBtn>

                {isStyleMenuOpen && (
                    <div
                        className={clsx(
                            'MarkdownNotebook__format-style-dropdown',
                            placement === 'below'
                                ? 'MarkdownNotebook__format-style-dropdown--below'
                                : 'MarkdownNotebook__format-style-dropdown--above'
                        )}
                        ref={styleMenuRef}
                        role="menu"
                    >
                        {TEXT_BLOCK_STYLE_BUTTONS.map((button) => {
                            const isActive =
                                button.style === 'blockquote'
                                    ? selectedBlockQuoted
                                    : selectedBlockStyle === button.style
                            return (
                                <button
                                    key={button.label}
                                    type="button"
                                    role="menuitem"
                                    className={clsx(
                                        'MarkdownNotebook__format-style-menu-item',
                                        isActive && 'MarkdownNotebook__format-style-menu-item--active'
                                    )}
                                    onPointerDown={(event) => {
                                        event.preventDefault()
                                    }}
                                    onClick={() => {
                                        setBlockStyle(
                                            button.style === 'blockquote' || !isActive
                                                ? button.style
                                                : 'paragraph'
                                        )
                                        setIsStyleMenuOpen(false)
                                    }}
                                >
                                    <span className="MarkdownNotebook__format-style-menu-icon">
                                        {button.icon || (
                                            <span className="font-semibold text-[11px]">
                                                {button.content}
                                            </span>
                                        )}
                                    </span>
                                    <span className="MarkdownNotebook__format-style-menu-label">
                                        {button.label}
                                    </span>
                                    {isActive && (
                                        <IconCheck className="ml-auto size-3.5 text-blue-600 dark:text-blue-400" />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* 2. Inline Formatting: Bold, Italic, Strikethrough, Code, Link, AI */}
            {showInlineActions ? (
                <>
                    <FormatBtn
                        label="Bold (Cmd+B)"
                        active={activeMarks?.bold}
                        onClick={() => applyInlineMark('bold')}
                    >
                        <IconBold className="size-3.5" />
                    </FormatBtn>
                    <FormatBtn
                        label="Italic (Cmd+I)"
                        active={activeMarks?.italic}
                        onClick={() => applyInlineMark('italic')}
                    >
                        <IconItalic className="size-3.5" />
                    </FormatBtn>
                    <FormatBtn
                        label="Strikethrough"
                        active={activeMarks?.strike}
                        onClick={() => applyInlineMark('strike')}
                    >
                        <IconStrikethrough className="size-3.5" />
                    </FormatBtn>
                    <FormatBtn
                        label="Inline code (Cmd+E)"
                        active={activeMarks?.code}
                        onClick={() => applyInlineMark('code')}
                    >
                        <IconCode className="size-3.5" />
                    </FormatBtn>
                    <FormatBtn
                        label="Link (Cmd+K)"
                        active={hasExistingLink || isLinkEditorOpen}
                        onClick={openLinkEditor}
                    >
                        <IconLink className="size-3.5" />
                    </FormatBtn>
                    {askAIAboutSelection ? (
                        <FormatBtn
                            label="Ask WIM AI"
                            disabled={isAskAIDisabled}
                            onClick={() => askAIAboutSelection()}
                        >
                            <IconSparkles className="size-3.5" />
                        </FormatBtn>
                    ) : null}

                    {/* Divider before secondary actions */}
                    <span className="MarkdownNotebook__format-divider" aria-hidden />

                    {startInlineCommentAtSelection ? (
                        <FormatBtn
                            label="Comment on selection"
                            onClick={startInlineCommentAtSelection}
                        >
                            <IconComment className="size-3.5" />
                        </FormatBtn>
                    ) : null}
                    <FormatBtn label="Copy selection" onClick={copySelection}>
                        <IconCopy className="size-3.5" />
                    </FormatBtn>
                    {onOutdent ? (
                        <FormatBtn label="Outdent" onClick={onOutdent} disabled={canOutdent === false}>
                            <IconOutdent className="size-3.5" />
                        </FormatBtn>
                    ) : null}
                    {onIndent ? (
                        <FormatBtn label="Indent" onClick={onIndent} disabled={canIndent === false}>
                            <IconIndent className="size-3.5" />
                        </FormatBtn>
                    ) : null}
                </>
            ) : null}

            {/* Attached popover link editor */}
            {showInlineActions && isLinkEditorOpen ? (
                <div
                    className={clsx(
                        'MarkdownNotebook__format-link-editor',
                        placement === 'below'
                            ? 'MarkdownNotebook__format-link-editor--below'
                            : 'MarkdownNotebook__format-link-editor--above'
                    )}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <input
                        ref={linkInputRef}
                        type="url"
                        placeholder="https://..."
                        aria-label="Link URL"
                        value={linkHref}
                        autoFocus={shouldFocusLinkInput}
                        onChange={(event) => setLinkHref(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault()
                                event.stopPropagation()
                                setLink()
                            } else if (event.key === 'Escape') {
                                event.preventDefault()
                                event.stopPropagation()
                                setIsLinkEditorOpen(false)
                            }
                        }}
                        className="MarkdownNotebook__format-link-input rounded border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 px-2 py-1 text-xs text-primary outline-none focus:border-blue-500"
                    />
                    {hasExistingLink && sanitizeNotebookLinkHref(currentLinkHref ?? '') ? (
                        <FormatBtn
                            label="Open link in new tab"
                            onClick={() => {
                                const href = sanitizeNotebookLinkHref(currentLinkHref ?? '')
                                if (href) {
                                    window.open(href, '_blank', 'noopener')
                                }
                            }}
                        >
                            <IconExternal />
                        </FormatBtn>
                    ) : null}
                    {hasExistingLink ? (
                        <FormatBtn label="Remove link" onClick={removeLink}>
                            <span className="text-[11px] font-medium text-red-500">Remove</span>
                        </FormatBtn>
                    ) : null}
                    <FormatBtn
                        label={hasExistingLink ? 'Update' : 'Set'}
                        disabled={!normalizedLinkHref}
                        onClick={setLink}
                    >
                        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                            {hasExistingLink ? 'Update' : 'Set'}
                        </span>
                    </FormatBtn>
                </div>
            ) : null}
        </div>
    )
}

export function getTextBlockStyle(node: NotebookTextBlockNode): TextBlockStyle {
    if (node.type === 'heading') {
        const level = node.level ?? 1
        return level === 1 || level === 2 || level === 3 ? level : 3
    }

    return node.type === 'blockquote' ? 'blockquote' : 'paragraph'
}

export function getSelectedBlockStyle(
    textRanges: FloatingToolbarTextRange[],
    codeRanges: FloatingToolbarCodeRange[],
    listItemRanges: FloatingToolbarListItemRange[] = []
): TextBlockStyle | null {
    // Plain list items map to `null` so a mixed selection never reports a shared style.
    const styles = new Set<TextBlockStyle | null>([
        ...textRanges.map(({ node }): TextBlockStyle | null => getTextBlockStyle(node)),
        ...codeRanges.map((): TextBlockStyle | null => 'code'),
        ...listItemRanges.map(({ node }): TextBlockStyle | null => (node.blockquote ? 'blockquote' : null)),
    ])

    if (styles.size !== 1) {
        return null
    }

    return [...styles][0]
}

/** True when the selection is non-empty and every selected block sits inside a blockquote. */
export function getSelectedBlocksQuoted(
    textRanges: FloatingToolbarTextRange[],
    codeRanges: FloatingToolbarCodeRange[],
    listItemRanges: FloatingToolbarListItemRange[] = []
): boolean {
    if (codeRanges.length || (!textRanges.length && !listItemRanges.length)) {
        return false
    }

    return (
        textRanges.every(({ node }) => node.type === 'blockquote' || !!node.blockquote) &&
        listItemRanges.every(({ node }) => !!node.blockquote)
    )
}

export function getSelectedTextBlockStyle(textRanges: FloatingToolbarTextRange[]): TextBlockStyle | null {
    const firstTextRange = textRanges[0]
    if (!firstTextRange) {
        return null
    }

    const firstStyle = getTextBlockStyle(firstTextRange.node)
    return textRanges.every(({ node }) => getTextBlockStyle(node) === firstStyle) ? firstStyle : null
}

/** The href shown in the link editor — only when exactly one inline range is selected. */
export function getFloatingToolbarLinkHref(toolbar: FloatingToolbarState): string | null {
    if (toolbar.codeRanges.length) {
        return null
    }

    if (toolbar.textRanges.length === 1 && toolbar.listItemRanges.length === 0) {
        return getSelectedLinkHref(toolbar.textRanges[0].node.children, toolbar.textRanges[0].range)
    }

    if (toolbar.listItemRanges.length === 1 && toolbar.textRanges.length === 0) {
        const { node, itemIndex, range } = toolbar.listItemRanges[0]
        return getSelectedLinkHref(node.items[itemIndex]?.children ?? [], range)
    }

    return null
}
