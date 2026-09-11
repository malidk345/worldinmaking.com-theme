import clsx from 'clsx'
import { ReactNode, type CSSProperties, useEffect, useMemo, useRef } from 'react'

import { IconCheck, IconCode, IconDocument, IconList, IconPencil, IconSparkles } from '@posthog/icons'

import {
    INSERT_MENU_GAP,
    INSERT_MENU_MAX_HEIGHT,
    INSERT_MENU_MIN_HEIGHT,
    INSERT_MENU_VIEWPORT_PADDING,
    INSERT_MENU_WIDTH,
    type InsertCommand,
    InsertMenuPosition,
    InsertMenuSelectionDirection,
} from './editorTypes'
import {
    createInsertedCodeBlock,
    createInsertedListBlock,
    createInsertedTableBlock,
} from './documentModel'
import { makeEmptyParagraph } from './markdown'
import { isSlashRegistryTag } from './insertCatalog'
import { getMarkdownNotebookComponentDefaultProps } from './registry'
import {
    NotebookBlockNode,
    NotebookComponentBlockNode,
    NotebookComponentDefinition,
    NotebookComponentProps,
    NotebookComponentRegistry,
} from './types'
import {
    getFilteredInsertCommands,
    groupInsertCommandsByCategory,
    getClampedInsertMenuSelectedIndex,
} from './insertMenuModel'

/** DOM id of a command's option element, referenced by the editor's `aria-activedescendant`. */
export function getInsertMenuOptionDomId(menuId: string, commandKey: string): string {
    return `${menuId}-option-${commandKey}`
}

/** The menu's top group. Exported so a registry component can place its insert command here
 * without hard-coding the label, which would split into a second group if this were renamed. */
export const COMMON_INSERT_COMMAND_CATEGORY = 'Common'
export type { InsertCommand }

export function omitInsertCommands(commands: InsertCommand[], hiddenKeys: string[] | undefined): InsertCommand[] {
    if (!hiddenKeys?.length) {
        return commands
    }
    return commands.filter((command) => !hiddenKeys.includes(command.key))
}

export function InsertMenu({
    id,
    query,
    commands,
    targetNodeId,
    position,
    selectedIndex,
    onClose,
    context = 'block',
}: {
    id?: string
    query: string
    commands: InsertCommand[]
    targetNodeId: string
    position: InsertMenuPosition | null
    selectedIndex: number
    onClose: () => void
    context?: 'inline' | 'block'
}): JSX.Element {
    const selectedItemRef = useRef<HTMLButtonElement | null>(null)
    const filteredCommands = useMemo(
        () => getFilteredInsertCommands(commands, query, context),
        [commands, query, context]
    )
    const commandsByCategory = useMemo(() => groupInsertCommandsByCategory(filteredCommands), [filteredCommands])
    const selectedCommandIndex = getClampedInsertMenuSelectedIndex(selectedIndex, filteredCommands.length)
    const selectedCommand = filteredCommands[selectedCommandIndex]
    const selectedCommandKey = selectedCommand?.key
    const menuStyle =
        position && Number.isFinite(position.left) && Number.isFinite(position.top)
            ? ({
                  '--markdown-notebook-insert-menu-left': `${Math.round(position.left)}px`,
                  '--markdown-notebook-insert-menu-max-height': `${Math.round(position.maxHeight)}px`,
                  '--markdown-notebook-insert-menu-top': `${Math.round(position.top)}px`,
                  '--markdown-notebook-insert-menu-width': `${Math.round(position.width)}px`,
              } as CSSProperties)
            : undefined

    useEffect(() => {
        selectedItemRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }, [selectedCommandKey])

    return (
        <div
            className={clsx(
                'MarkdownNotebook__insert-menu',
                position && 'MarkdownNotebook__insert-menu--positioned',
                position && `MarkdownNotebook__insert-menu--${position.placement}`
            )}
            contentEditable={false}
            style={menuStyle}
            id={id}
            role="listbox"
            aria-label="Insert block"
        >
            {/* Focus stays in the editor while the menu is open, so screen readers may miss the
                aria-activedescendant change — announce the selection explicitly. */}
            <div className="sr-only" aria-live="polite">
                {selectedCommand
                    ? `${selectedCommand.label}, ${selectedCommandIndex + 1} of ${filteredCommands.length}`
                    : 'No components found'}
            </div>
            {Object.entries(commandsByCategory).map(([category, categoryCommands]) => (
                <div className="MarkdownNotebook__insert-category" key={category} role="group" aria-label={category}>
                    <h5 aria-hidden="true">{category}</h5>
                    <div className="MarkdownNotebook__insert-grid">
                        {categoryCommands.map((command) => (
                            <button
                                ref={command.key === selectedCommandKey ? selectedItemRef : null}
                                className={clsx(
                                    'MarkdownNotebook__insert-item',
                                    command.key === selectedCommandKey && 'MarkdownNotebook__insert-item--selected'
                                )}
                                key={command.key}
                                id={id ? getInsertMenuOptionDomId(id, command.key) : undefined}
                                role="option"
                                aria-selected={command.key === selectedCommandKey}
                                disabled={command.disabled}
                                type="button"
                                onPointerDown={(event) => {
                                    event.preventDefault()
                                }}
                                onClick={() => {
                                    if (command.disabled) {
                                        return
                                    }
                                    command.run(targetNodeId)
                                    if (command.closeOnRun !== false) {
                                        onClose()
                                    }
                                }}
                            >
                                {command.icon ? (
                                    <span className="MarkdownNotebook__insert-item-icon">{command.icon}</span>
                                ) : null}
                                <span>{renderHighlightedInsertCommandLabel(command.label, query)}</span>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
            {!filteredCommands.length ? (
                <div className="MarkdownNotebook__empty-menu">No matching blocks</div>
            ) : null}
        </div>
    )
}

export function renderHighlightedInsertCommandLabel(label: string, query: string): ReactNode {
    const normalizedQuery = query.trim().toLowerCase()
    const matchIndex = normalizedQuery ? label.toLowerCase().indexOf(normalizedQuery) : -1
    if (matchIndex === -1) {
        return label
    }

    const matchEndIndex = matchIndex + normalizedQuery.length
    return (
        <>
            {label.slice(0, matchIndex)}
            <mark className="MarkdownNotebook__insert-item-highlight">{label.slice(matchIndex, matchEndIndex)}</mark>
            {label.slice(matchEndIndex)}
        </>
    )
}

export {
    getNodeInsertContext,
    normalizeForSearch,
    getInsertCommandSearchText,
    groupInsertCommandsByCategory,
    getClampedInsertMenuSelectedIndex,
    getNextInsertMenuSelectedIndex,
    getFilteredInsertCommands,
} from './insertMenuModel'

export function buildInsertCommands(
    registry: NotebookComponentRegistry,
    replaceNodeWithInsertedComponent: (nodeId: string, nextNode: NotebookComponentBlockNode) => void,
    replaceNode: (nodeId: string, nextNode: NotebookBlockNode) => void,
    focusInsertedText: (nodeId: string) => void,
    focusInsertedTable: (nodeId: string) => void,
    focusInsertedCode: (nodeId: string) => void,
    openAIPrompt?: (nodeId: string) => void,
    isAskAIDisabled?: boolean,
    extraCommands: InsertCommand[] = [],
    focusInsertedList?: (nodeId: string) => void,
    insertFootnote?: (targetNodeId: string) => void
): InsertCommand[] {
    const commonCategory = COMMON_INSERT_COMMAND_CATEGORY

    const insertComponent = (targetNodeId: string, tagName: string, props: NotebookComponentProps): void => {
        const node: NotebookComponentBlockNode = {
            id: makeEmptyParagraph(`component-${tagName}`).id,
            type: 'component',
            tagName,
            props,
        }

        replaceNodeWithInsertedComponent(targetNodeId, node)
    }

    const insertRegisteredComponent = (targetNodeId: string, tagName: string, props?: NotebookComponentProps): void => {
        const definition = registry.components[tagName]
        if (!definition) {
            return
        }

        insertComponent(targetNodeId, tagName, props ?? getMarkdownNotebookComponentDefaultProps(definition))
    }

    const getRegisteredComponentInsertProps = (definition: NotebookComponentDefinition): NotebookComponentProps => {
        const insertDefaultProps = definition.insertCommand?.defaultProps
        if (typeof insertDefaultProps === 'function') {
            return insertDefaultProps()
        }
        return insertDefaultProps ?? getMarkdownNotebookComponentDefaultProps(definition)
    }

    const insertTable = (targetNodeId: string): void => {
        const nodeId = makeEmptyParagraph('table').id
        replaceNode(targetNodeId, createInsertedTableBlock(nodeId))
        focusInsertedTable(nodeId)
    }

    const insertCode = (targetNodeId: string): void => {
        replaceNode(targetNodeId, createInsertedCodeBlock(targetNodeId))
        focusInsertedCode(targetNodeId)
    }

    const insertList = (targetNodeId: string, options: { ordered: boolean; task?: boolean }): void => {
        const nodeId = makeEmptyParagraph('list').id
        replaceNode(
            targetNodeId,
            createInsertedListBlock({
                id: nodeId,
                ordered: options.ordered,
                checked: options.task ? false : undefined,
            })
        )
        if (focusInsertedList) {
            focusInsertedList(nodeId)
        } else {
            focusInsertedText(nodeId)
        }
    }

    const aiCommands: InsertCommand[] = openAIPrompt
        ? [
              {
                  key: 'ai-ask',
                  label: 'WIM AI',
                  category: commonCategory,
                  description: 'Follow an instruction and write into the notebook',
                  aliases: [
                      'ai',
                      'ask',
                      'wim',
                      'wimai',
                      'edit',
                      'rewrite',
                      'editor',
                      'inline',
                      'prompt',
                      'duzelt',
                      'düzelt',
                      'yaz',
                      'ekle',
                      'olustur',
                      'oluştur',
                      'yap',
                  ],

                  icon: <IconSparkles />,
                  closeOnRun: false,
                  disabled: isAskAIDisabled,
                  run: openAIPrompt,
              },
          ]
        : []

    // Native markdown blocks live here. Component tags (Image, Embed, LaTeX, Callout…)
    // must opt in through `definition.insertCommand` so slash has one catalog, not two.
    const mediaCommands: InsertCommand[] = [
        {
            key: 'media-table',
            label: 'Table',
            category: 'Media',
            description: 'Markdown table',
            aliases: ['grid', 'spreadsheet', 'gfm'],
            icon: <IconList />,
            run: insertTable,
        },
    ]

    const componentCommands: InsertCommand[] = Object.values(registry.components).flatMap((definition) => {
        const insertCommand = definition.insertCommand
        if (!insertCommand || !isSlashRegistryTag(definition.tagName)) {
            return []
        }

        return [
            {
                key: `component-${definition.tagName}`,
                label: insertCommand.label ?? definition.label,
                category: insertCommand.category ?? definition.category,
                description: insertCommand.description ?? definition.description,
                aliases: insertCommand.aliases ?? definition.aliases,
                icon: insertCommand.icon ?? definition.icon,
                run: (targetNodeId) =>
                    insertRegisteredComponent(
                        targetNodeId,
                        definition.tagName,
                        getRegisteredComponentInsertProps(definition)
                    ),
            },
        ]
    })

    const textCommands: InsertCommand[] = [
        {
            key: 'text-paragraph',
            label: 'Text',
            category: commonCategory,
            description: 'Plain text paragraph',
            aliases: ['paragraph', 'plain text', 'metin', 'paragraf', 'yazı', 'yazi'],
            icon: <IconPencil />,
            run: (targetNodeId) => {
                replaceNode(targetNodeId, {
                    id: targetNodeId,
                    type: 'paragraph',
                    children: [],
                })
                focusInsertedText(targetNodeId)
            },
        },
    ]

    const textStyleCommands: InsertCommand[] = [
        {
            key: 'text-quote',
            label: 'Blockquote',
            category: 'Text',
            description: 'Quote block',
            aliases: ['quote', 'blockquote', 'alıntı', 'alinti', 'alıntı bloğu', 'alinti blogu'],
            icon: <IconPencil />,
            run: (targetNodeId) => {
                replaceNode(targetNodeId, {
                    id: targetNodeId,
                    type: 'blockquote',
                    children: [],
                })
                focusInsertedText(targetNodeId)
            },
        },
        {
            key: 'text-code',
            label: 'Code',
            category: 'Text',
            description: 'Code block',
            aliases: ['code block', 'fenced code', 'kod', 'kod blogu', 'kod bloğu', 'snippet'],
            icon: <IconCode />,
            run: insertCode,
        },
        {
            key: 'text-heading-1',
            label: 'Heading 1',
            category: 'Text',
            description: 'Large section heading',
            aliases: [
                'h1',
                'heading 1',
                'heading1',
                'h 1',
                'header 1',
                'header1',
                'header',
                'title',
                'başlık 1',
                'baslik 1',
                'başlık',
                'baslik',
                'ana başlık',
                'ana baslik',
            ],
            icon: <IconPencil />,
            run: (targetNodeId) => {
                replaceNode(targetNodeId, {
                    id: targetNodeId,
                    type: 'heading',
                    level: 1,
                    children: [],
                })
                focusInsertedText(targetNodeId)
            },
        },
        {
            key: 'text-heading-2',
            label: 'Heading 2',
            category: 'Text',
            description: 'Medium section heading',
            aliases: [
                'h2',
                'heading 2',
                'heading2',
                'h 2',
                'header 2',
                'header2',
                'subtitle',
                'başlık 2',
                'baslik 2',
                'alt başlık',
                'alt baslik',
            ],
            icon: <IconPencil />,
            run: (targetNodeId) => {
                replaceNode(targetNodeId, {
                    id: targetNodeId,
                    type: 'heading',
                    level: 2,
                    children: [],
                })
                focusInsertedText(targetNodeId)
            },
        },
        {
            key: 'text-heading-3',
            label: 'Heading 3',
            category: 'Text',
            description: 'Small section heading',
            aliases: [
                'h3',
                'heading 3',
                'heading3',
                'h 3',
                'header 3',
                'header3',
                'subheading',
                'başlık 3',
                'baslik 3',
                'küçük başlık',
                'kucuk baslik',
            ],
            icon: <IconPencil />,
            run: (targetNodeId) => {
                replaceNode(targetNodeId, {
                    id: targetNodeId,
                    type: 'heading',
                    level: 3,
                    children: [],
                })
                focusInsertedText(targetNodeId)
            },
        },
        {
            key: 'text-bullet-list',
            label: 'Bulleted list',
            category: 'Text',
            description: 'Bullet list',
            aliases: ['bullet', 'bulleted', 'ul', 'list', 'madde', 'liste', 'noktalı', 'noktali'],
            icon: <IconList />,
            run: (targetNodeId) => insertList(targetNodeId, { ordered: false }),
        },
        {
            key: 'text-numbered-list',
            label: 'Numbered list',
            category: 'Text',
            description: 'Numbered list',
            aliases: ['numbered', 'ordered', 'ol', 'numarali', 'numaralı', 'sayı', 'sayili'],
            icon: <IconList />,
            run: (targetNodeId) => insertList(targetNodeId, { ordered: true }),
        },
        {
            key: 'text-todo-list',
            label: 'To-do list',
            category: 'Text',
            description: 'Task checkbox list',
            aliases: ['todo', 'task', 'checkbox', 'check', 'gorev', 'görev', 'yapılacaklar', 'yapilacaklar'],
            icon: <IconCheck />,
            run: (targetNodeId) => insertList(targetNodeId, { ordered: false, task: true }),
        },
    ]

    const footnoteCommands: InsertCommand[] = insertFootnote
        ? [
              {
                  key: 'insert-footnote',
                  label: 'Footnote',
                  category: commonCategory,
                  description: 'Insert a footnote reference',
                  aliases: ['footnote', 'dipnot', 'fn', 'note'],
                  icon: <IconDocument />,
                  run: insertFootnote,
                  scope: 'all',
              },
          ]
        : []

    return [
        ...aiCommands,
        ...footnoteCommands,
        ...textCommands,
        ...mediaCommands,
        ...componentCommands,
        ...textStyleCommands,
        ...extraCommands,
    ]
}

function getVisibleViewport(): { top: number; left: number; width: number; height: number; bottom: number; right: number } {
    const vv = window.visualViewport
    const left = vv?.offsetLeft ?? 0
    const top = vv?.offsetTop ?? 0
    const width = vv?.width ?? (window.innerWidth || document.documentElement.clientWidth)
    const height = vv?.height ?? (window.innerHeight || document.documentElement.clientHeight)
    return { top, left, width, height, bottom: top + height, right: left + width }
}

export function getInsertMenuPosition(
    anchorElement: HTMLElement,
    size?: { width?: number; maxHeight?: number; minHeight?: number }
): InsertMenuPosition {
    const viewport = getVisibleViewport()
    const isMobile = viewport.width < 640
    const padding = isMobile ? 12 : INSERT_MENU_VIEWPORT_PADDING
    const availableViewportWidth = Math.max(0, viewport.width - padding * 2)

    const defaultPreferredWidth = isMobile
        ? Math.min(256, availableViewportWidth)
        : INSERT_MENU_WIDTH
    const preferredWidth = size?.width ?? defaultPreferredWidth
    const preferredMaxHeight = size?.maxHeight ?? INSERT_MENU_MAX_HEIGHT
    const preferredMinHeight = size?.minHeight ?? INSERT_MENU_MIN_HEIGHT

    const anchorRect = anchorElement.getBoundingClientRect()
    const width = Math.min(preferredWidth, availableViewportWidth)
    const maxLeft = Math.max(viewport.left + padding, viewport.right - padding - width)
    const minLeft = viewport.left + padding
    const left = Math.max(minLeft, Math.min(anchorRect.left, maxLeft))

    const availableBelow = Math.max(
        0,
        viewport.bottom - anchorRect.bottom - INSERT_MENU_GAP - padding
    )
    const availableAbove = Math.max(
        0,
        anchorRect.top - viewport.top - INSERT_MENU_GAP - padding
    )
    const effectiveMinHeight = isMobile ? 80 : preferredMinHeight
    const placement =
        availableBelow >= effectiveMinHeight || availableBelow >= availableAbove ? 'below' : 'above'
    const availableHeight = placement === 'below' ? availableBelow : availableAbove

    return {
        placement,
        top: placement === 'below' ? anchorRect.bottom + INSERT_MENU_GAP : anchorRect.top - INSERT_MENU_GAP,
        left,
        width,
        maxHeight: Math.min(preferredMaxHeight, Math.max(60, availableHeight)),
    }
}
