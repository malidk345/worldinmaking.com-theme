import clsx from 'clsx'
import { ReactNode, type CSSProperties, useEffect, useRef } from 'react'

import { IconCheck, IconCode, IconList, IconPencil, IconSparkles } from '@posthog/icons'

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
}: {
    id?: string
    query: string
    commands: InsertCommand[]
    targetNodeId: string
    position: InsertMenuPosition | null
    selectedIndex: number
    onClose: () => void
}): JSX.Element {
    const selectedItemRef = useRef<HTMLButtonElement | null>(null)
    const filteredCommands = getFilteredInsertCommands(commands, query)
    const commandsByCategory = groupInsertCommandsByCategory(filteredCommands)
    const selectedCommandIndex = getClampedInsertMenuSelectedIndex(selectedIndex, filteredCommands.length)
    const selectedCommand = filteredCommands[selectedCommandIndex]
    const selectedCommandKey = selectedCommand?.key
    const menuStyle = position
        ? ({
              '--markdown-notebook-insert-menu-left': `${position.left}px`,
              '--markdown-notebook-insert-menu-max-height': `${position.maxHeight}px`,
              '--markdown-notebook-insert-menu-top': `${position.top}px`,
              '--markdown-notebook-insert-menu-width': `${position.width}px`,
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

export function getFilteredInsertCommands(commands: InsertCommand[], query: string): InsertCommand[] {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
        return commands
    }

    return commands.filter((command) => getInsertCommandSearchText(command).includes(normalizedQuery))
}

export function getInsertCommandSearchText(command: InsertCommand): string {
    return `${command.label} ${command.category} ${command.description ?? ''} ${(command.aliases ?? []).join(' ')}`
        .trim()
        .toLowerCase()
}

export function groupInsertCommandsByCategory(commands: InsertCommand[]): Record<string, InsertCommand[]> {
    return commands.reduce<Record<string, InsertCommand[]>>((accumulator, command) => {
        // Optimize: mutate array in-place with push to avoid O(N^2) spread allocations
        if (!accumulator[command.category]) {
            accumulator[command.category] = []
        }
        accumulator[command.category].push(command)
        return accumulator
    }, {})
}

export function getClampedInsertMenuSelectedIndex(selectedIndex: number, commandCount: number): number {
    if (commandCount <= 0) {
        return 0
    }
    return Math.max(0, Math.min(selectedIndex, commandCount - 1))
}

export function getNextInsertMenuSelectedIndex(
    selectedIndex: number,
    commandCount: number,
    direction: InsertMenuSelectionDirection
): number {
    if (commandCount <= 0) {
        return 0
    }

    const clampedIndex = getClampedInsertMenuSelectedIndex(selectedIndex, commandCount)
    return direction === 'next' ? (clampedIndex + 1) % commandCount : (clampedIndex - 1 + commandCount) % commandCount
}

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
    focusInsertedList?: (nodeId: string) => void
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
            aliases: ['paragraph', 'plain text'],
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
            aliases: ['quote'],
            icon: <IconPencil />,
            run: (targetNodeId) =>
                replaceNode(targetNodeId, {
                    id: targetNodeId,
                    type: 'blockquote',
                    children: [],
                }),
        },
        {
            key: 'text-code',
            label: 'Code',
            category: 'Text',
            aliases: ['code block', 'fenced code'],
            icon: <IconCode />,
            run: insertCode,
        },
        {
            key: 'text-heading-1',
            label: 'Heading 1',
            category: 'Text',
            aliases: ['h1'],
            icon: <IconPencil />,
            run: (targetNodeId) =>
                replaceNode(targetNodeId, {
                    id: targetNodeId,
                    type: 'heading',
                    level: 1,
                    children: [],
                }),
        },
        {
            key: 'text-heading-2',
            label: 'Heading 2',
            category: 'Text',
            aliases: ['h2'],
            icon: <IconPencil />,
            run: (targetNodeId) =>
                replaceNode(targetNodeId, {
                    id: targetNodeId,
                    type: 'heading',
                    level: 2,
                    children: [],
                }),
        },
        {
            key: 'text-heading-3',
            label: 'Heading 3',
            category: 'Text',
            aliases: ['h3'],
            icon: <IconPencil />,
            run: (targetNodeId) =>
                replaceNode(targetNodeId, {
                    id: targetNodeId,
                    type: 'heading',
                    level: 3,
                    children: [],
                }),
        },
        {
            key: 'text-bullet-list',
            label: 'Bulleted list',
            category: 'Text',
            description: 'Bullet list',
            aliases: ['bullet', 'bulleted', 'ul', 'list', 'madde'],
            icon: <IconList />,
            run: (targetNodeId) => insertList(targetNodeId, { ordered: false }),
        },
        {
            key: 'text-numbered-list',
            label: 'Numbered list',
            category: 'Text',
            description: 'Numbered list',
            aliases: ['numbered', 'ordered', 'ol', 'numarali'],
            icon: <IconList />,
            run: (targetNodeId) => insertList(targetNodeId, { ordered: true }),
        },
        {
            key: 'text-todo-list',
            label: 'To-do list',
            category: 'Text',
            description: 'Task checkbox list',
            aliases: ['todo', 'task', 'checkbox', 'check', 'gorev'],
            icon: <IconCheck />,
            run: (targetNodeId) => insertList(targetNodeId, { ordered: false, task: true }),
        },
    ]

    return [...aiCommands, ...textCommands, ...mediaCommands, ...componentCommands, ...textStyleCommands, ...extraCommands]
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
    const preferredWidth = size?.width ?? INSERT_MENU_WIDTH
    const preferredMaxHeight = size?.maxHeight ?? INSERT_MENU_MAX_HEIGHT
    const preferredMinHeight = size?.minHeight ?? INSERT_MENU_MIN_HEIGHT
    const anchorRect = anchorElement.getBoundingClientRect()
    const viewport = getVisibleViewport()
    const availableViewportWidth = Math.max(0, viewport.width - INSERT_MENU_VIEWPORT_PADDING * 2)
    const width = Math.min(preferredWidth, availableViewportWidth)
    const maxLeft = viewport.right - INSERT_MENU_VIEWPORT_PADDING - width
    const left = Math.min(
        Math.max(viewport.left + INSERT_MENU_VIEWPORT_PADDING, anchorRect.left),
        Math.max(viewport.left + INSERT_MENU_VIEWPORT_PADDING, maxLeft)
    )
    const availableBelow = Math.max(
        0,
        viewport.bottom - anchorRect.bottom - INSERT_MENU_GAP - INSERT_MENU_VIEWPORT_PADDING
    )
    const availableAbove = Math.max(0, anchorRect.top - viewport.top - INSERT_MENU_GAP - INSERT_MENU_VIEWPORT_PADDING)
    const placement = availableBelow >= preferredMinHeight || availableBelow >= availableAbove ? 'below' : 'above'
    const availableHeight = placement === 'below' ? availableBelow : availableAbove

    return {
        placement,
        top: placement === 'below' ? anchorRect.bottom + INSERT_MENU_GAP : anchorRect.top - INSERT_MENU_GAP,
        left,
        width,
        maxHeight: Math.min(preferredMaxHeight, Math.max(preferredMinHeight, availableHeight)),
    }
}
