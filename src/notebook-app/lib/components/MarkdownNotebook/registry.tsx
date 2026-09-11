import { useState } from 'react'

import {
    IconCode,
    IconCollapse,
    IconComment,
    IconDatabase,
    IconDocument,
    IconInfo,
    IconMinus,
    IconPencil,
    IconUpload,
} from '@posthog/icons'
import OSButton from '../../../../components/OSButton'

import { wasNotebookNodeJustInserted } from './freshlyInserted'
import { isSlashRegistryTag } from './insertCatalog'
import { isSafeEmbedSrc, normalizeEmbedSrc } from './embedUrl'
import { LatexEdit, LatexView } from './LatexBlock'
import {
    CalloutBlock,
    DatabaseTableBlock,
    ImageUploadBlock,
    SubpageBlock,
    ToggleBlock,
    getDefaultDatabaseProps,
} from './WimWritingBlocks'
import {
    NotebookComponentDefinition,
    NotebookComponentBlockNode,
    NotebookComponentProps,
    NotebookComponentRegistry,
    NotebookComponentRenderProps,
    NotebookPropValue,
} from './types'
import { isNotebookComponentProps } from './utils'

export function createMarkdownNotebookRegistry(definitions: NotebookComponentDefinition[]): NotebookComponentRegistry {
    return {
        components: definitions.reduce<Record<string, NotebookComponentDefinition>>((accumulator, definition) => {
            accumulator[definition.tagName] = definition
            return accumulator
        }, {}),
    }
}

export function mergeMarkdownNotebookRegistries(
    baseRegistry: NotebookComponentRegistry,
    overrideRegistry?: NotebookComponentRegistry
): NotebookComponentRegistry {
    return {
        components: {
            ...baseRegistry.components,
            ...overrideRegistry?.components,
        },
    }
}

export function getMarkdownNotebookComponentDefinition(
    registry: NotebookComponentRegistry,
    tagName: string
): NotebookComponentDefinition | null {
    return registry.components[tagName] ?? null
}

export function getMarkdownNotebookComponentDefaultProps(
    definition: NotebookComponentDefinition
): NotebookComponentProps {
    return typeof definition.defaultProps === 'function' ? definition.defaultProps() : (definition.defaultProps ?? {})
}

export function getMarkdownNotebookDefaultRegistry(): NotebookComponentRegistry {
    return createMarkdownNotebookRegistry([
        makeDefinition({
            tagName: 'Image',
            label: 'Image',
            category: 'Media',
            description: 'Image block',
            icon: <IconUpload />,
            defaultProps: { src: '', alt: '' },
            getTitle: getImageComponentTitle,
            hideModeActions: true,
            exclusiveEditPanel: true,
            ViewComponent: ImageUploadBlock,
            EditComponent: ImageUploadBlock,
            insertCommand: {},
        }),
        makeDefinition({
            tagName: 'Callout',
            label: 'Callout',
            category: 'Text',
            description: 'Highlighted note',
            aliases: ['note', 'info', 'warning', 'tip', 'alert'],
            icon: <IconInfo />,
            defaultProps: { tone: 'note', text: '' },
            hideModeActions: true,
            exclusiveEditPanel: true,
            ViewComponent: CalloutBlock,
            EditComponent: CalloutBlock,
            insertCommand: {},
        }),
        makeDefinition({
            tagName: 'Toggle',
            label: 'Toggle',
            category: 'Text',
            description: 'Collapsible section',
            aliases: ['collapse', 'disclosure', 'fold', 'hidden'],
            icon: <IconCollapse />,
            defaultProps: { title: 'Toggle', body: '', open: true },
            hideModeActions: true,
            exclusiveEditPanel: true,
            ViewComponent: ToggleBlock,
            EditComponent: ToggleBlock,
            insertCommand: {},
        }),
        makeDefinition({
            tagName: 'DatabaseTable',
            label: 'Database',
            category: 'Media',
            description: 'Typed table with a board view',
            aliases: ['database', 'board', 'kanban', 'db'],
            icon: <IconDatabase />,
            defaultProps: getDefaultDatabaseProps,
            hideModeActions: true,
            exclusiveEditPanel: true,
            ViewComponent: DatabaseTableBlock,
            EditComponent: DatabaseTableBlock,
            insertCommand: {},
        }),
        makeDefinition({
            tagName: 'SubPage',
            label: 'Page',
            category: 'Common',
            description: 'Linked sub-document',
            aliases: ['subpage', 'card', 'nested'],
            icon: <IconDocument />,
            defaultProps: { notebookId: '', title: 'Untitled page' },
            hideModeActions: true,
            exclusiveEditPanel: true,
            ViewComponent: SubpageBlock,
            EditComponent: SubpageBlock,
        }),
        makeDefinition({
            tagName: 'Divider',
            label: 'Divider',
            category: 'Text',
            description: 'Horizontal rule',
            aliases: ['hr', 'horizontal rule', 'separator', 'line'],
            icon: <IconMinus />,
            defaultProps: {},
            getTitle: () => null,
            hideModeActions: true,
            ViewComponent: DividerView,
            insertCommand: {},
        }),
        makeDefinition({
            tagName: 'Comment',
            label: 'Note',
            category: 'Text',
            description: 'Hidden note stored as a markdown comment',
            aliases: ['note', 'annotation', 'todo', 'hidden comment'],
            icon: <IconComment />,
            defaultProps: { text: '' },
            getTitle: (node) => summarizeText(getStringProp(node.props.text)),
            hideModeActions: true,
            ViewComponent: CommentView,
            insertCommand: {},
        }),
        makeDefinition({
            tagName: 'Embed',
            label: 'Embed',
            category: 'Media',
            description: 'Embedded external content',
            icon: <IconCode />,
            defaultProps: { src: '', title: 'Embedded content' },
            getTitle: getEmbedComponentTitle,
            ViewComponent: EmbedView,
            EditComponent: EmbedEdit,
            insertCommand: {
                aliases: ['iframe', 'url', 'embed', 'video'],
            },
        }),
        makeDefinition({
            tagName: 'Latex',
            label: 'LaTeX',
            category: 'Media',
            description: 'Math expression',
            icon: <IconCode />,
            defaultProps: { content: 'E=mc^2' },
            getTitle: (node) => getStringProp(node.props.title) ?? summarizeText(getStringProp(node.props.content)),
            ViewComponent: LatexView,
            EditComponent: LatexEdit,
            insertCommand: {
                aliases: ['math', 'formula', 'equation', 'tex'],
            },
        }),
    ])
}

function makeDefinition(
    definition: Omit<NotebookComponentDefinition, 'EditComponent'> & {
        EditComponent?: NotebookComponentDefinition['EditComponent']
    }
): NotebookComponentDefinition {
    return {
        EditComponent: GenericComponentEdit,
        getTitle: getDefaultComponentTitle,
        ...definition,
        insertCommand:
            definition.insertCommand !== undefined
                ? definition.insertCommand
                : isSlashRegistryTag(definition.tagName)
                  ? {}
                  : undefined,
    }
}

function DividerView(_: NotebookComponentRenderProps): JSX.Element {
    return <hr className="MarkdownNotebook__divider" />
}

function CommentView({ node }: NotebookComponentRenderProps): JSX.Element {
    const text = typeof node.props.text === 'string' ? node.props.text : ''
    return <div className="MarkdownNotebook__comment-chip">{text || 'Comment'}</div>
}

function EmbedView({ node }: NotebookComponentRenderProps): JSX.Element {
    const raw = typeof node.props.src === 'string' ? node.props.src : ''
    const src = normalizeEmbedSrc(raw)
    const title = typeof node.props.title === 'string' && node.props.title.trim() ? node.props.title : 'Embedded content'

    if (!src || !isSafeEmbedSrc(src)) {
        return (
            <div className="MarkdownNotebook__embed-empty text-sm text-muted px-2 py-3">
                Paste a YouTube, Vimeo, Loom, or https link.
            </div>
        )
    }

    return (
        <iframe
            className="MarkdownNotebook__embed"
            src={src}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation"
        />
    )
}

function EmbedEdit({ node, updateProps }: NotebookComponentRenderProps): JSX.Element {
    const src = typeof node.props.src === 'string' ? node.props.src : ''
    const title = typeof node.props.title === 'string' ? node.props.title : ''

    return (
        <div className="MarkdownNotebook__component-form">
            <input
                value={title}
                onChange={(event) => updateProps({ title: event.target.value })}
                placeholder="Title"
                autoFocus={wasNotebookNodeJustInserted(node.id)}
                className="notebook-native-field w-full rounded-sm border border-primary px-2 py-1.5 text-sm text-primary placeholder:text-muted"
            />
            <input
                value={src}
                onChange={(event) => updateProps({ src: event.target.value })}
                onBlur={(event) => {
                    const next = normalizeEmbedSrc(event.target.value)
                    if (next !== src) updateProps({ src: next })
                }}
                placeholder="Paste YouTube / Vimeo / Loom / https URL"
                className="notebook-native-field w-full rounded-sm border border-primary px-2 py-1.5 text-sm text-primary placeholder:text-muted"
            />
            <EmbedView
                node={{ ...node, props: { ...node.props, src: normalizeEmbedSrc(src) } }}
                mode="view"
                updateProps={() => {}}
                deleteNode={() => {}}
            />
        </div>
    )
}

function SummaryView({ node }: NotebookComponentRenderProps): JSX.Element {
    return (
        <div className="MarkdownNotebook__component-preview">
            <pre>{JSON.stringify(node.props, null, 2)}</pre>
        </div>
    )
}

function getDefaultComponentTitle(node: NotebookComponentBlockNode): string | null {
    return (
        getStringProp(node.props.title) ??
        getStringProp(node.props.name) ??
        getStringProp(node.props.url) ??
        getStringProp(node.props.href) ??
        getStringProp(node.props.src) ??
        getStringProp(node.props.id)
    )
}

function getImageComponentTitle(node: NotebookComponentBlockNode): string | null {
    return (
        getStringProp(node.props.title) ??
        getStringProp(node.props.alt) ??
        getStringProp(node.props.src) ??
        getDefaultComponentTitle(node)
    )
}

function getEmbedComponentTitle(node: NotebookComponentBlockNode): string | null {
    return getStringProp(node.props.title) ?? getStringProp(node.props.src) ?? getDefaultComponentTitle(node)
}

function getStringProp(value: NotebookPropValue | undefined): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null
}

function summarizeText(value: string | null): string | null {
    const oneLineValue = value?.replace(/\s+/g, ' ').trim()
    if (!oneLineValue) {
        return null
    }
    return oneLineValue.length > 120 ? `${oneLineValue.slice(0, 117)}...` : oneLineValue
}

function GenericComponentEdit({ node, updateProps }: NotebookComponentRenderProps): JSX.Element {
    const [json, setJson] = useState(() => JSON.stringify(node.props, null, 2))
    const [error, setError] = useState<string | null>(null)

    const apply = (): void => {
        try {
            const parsed: unknown = JSON.parse(json)
            if (!isNotebookComponentProps(parsed)) {
                setError('Props must be a JSON object with serializable values.')
                return
            }
            updateProps(parsed)
            setError(null)
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Invalid JSON')
        }
    }

    return (
        <div className="MarkdownNotebook__component-edit">
            <textarea
                aria-label={`${splitTagName(node.tagName)} props`}
                value={json}
                onChange={(event) => setJson(event.target.value)}
                spellCheck={false}
            />
            <div className="MarkdownNotebook__component-edit-footer">
                {error ? (
                    <span className="text-danger">{error}</span>
                ) : (
                    <span className="text-muted">Component props</span>
                )}
                <OSButton size="sm" icon={<IconPencil />} onClick={apply}>
                    Apply
                </OSButton>
            </div>
        </div>
    )
}

function splitTagName(tagName: string): string {
    return tagName.replace(/([a-z])([A-Z])/g, '$1 $2')
}
