import React from 'react'
import { LemonInput, LemonTextArea } from '~nb-lib/lemon-ui/index'
import { createMarkdownNotebookRegistry } from '../../lib/components/MarkdownNotebook'
import {
    NotebookComponentBlockNode,
    NotebookComponentDefinition,
    NotebookComponentRenderProps,
    NotebookComponentRegistry,
} from '../../lib/components/MarkdownNotebook/types'
import { uuid } from '../../lib/utils/dom'
import { wasNotebookNodeJustInserted } from '../../lib/components/MarkdownNotebook/freshlyInserted'

import { NODE_ICONS } from './nodeIcons'
import { NotebookNodeType } from './types'
import { DataNodeShell } from './dataNodeShell'

export const MARKDOWN_TAG_TO_NOTEBOOK_NODE_TYPE: Partial<Record<string, NotebookNodeType>> = {
    Image: NotebookNodeType.Image,
    Embed: NotebookNodeType.Embed,
    Latex: NotebookNodeType.Latex,
}

export function ImageEdit({ node, updateProps }: NotebookComponentRenderProps): JSX.Element {
    const src = typeof node.props.src === 'string' ? node.props.src : ''
    const alt = typeof node.props.alt === 'string' ? node.props.alt : ''

    return (
        <div className="p-3 border rounded bg-surface-primary space-y-2">
            <LemonInput
                value={src}
                onChange={(value) => updateProps({ src: value })}
                placeholder="Image URL"
                autoFocus={wasNotebookNodeJustInserted(node.id)}
            />
            <LemonInput value={alt} onChange={(value) => updateProps({ alt: value })} placeholder="Alt text" />
        </div>
    )
}

export function EmbedEdit({ node, updateProps }: NotebookComponentRenderProps): JSX.Element {
    const src = typeof node.props.src === 'string' ? node.props.src : ''
    const title = typeof node.props.title === 'string' ? node.props.title : ''

    return (
        <div className="p-3 border rounded bg-surface-primary space-y-2">
            <LemonInput
                value={title}
                onChange={(value) => updateProps({ title: value })}
                placeholder="Title"
                autoFocus={wasNotebookNodeJustInserted(node.id)}
            />
            <LemonInput
                value={src}
                onChange={(value) => updateProps({ src: value })}
                placeholder="Enter URL or iframe URL"
            />
        </div>
    )
}

export function LatexEdit({ node, updateProps }: NotebookComponentRenderProps): JSX.Element {
    const content = typeof node.props.content === 'string' ? node.props.content : ''

    return (
        <div className="p-3 border rounded bg-surface-primary space-y-2">
            <LemonTextArea
                value={content}
                onChange={(value) => updateProps({ content: value })}
                placeholder="E = mc^2"
                minRows={3}
                autoFocus={wasNotebookNodeJustInserted(node.id)}
            />
        </div>
    )
}

export const MARKDOWN_NODE_DEFINITIONS: {
    tagName: string
    category: string
    label?: string
    EditComponent?: NotebookComponentDefinition['EditComponent']
    exclusiveEditPanel?: boolean
    insertCommand?: NotebookComponentDefinition['insertCommand']
}[] = [
    { tagName: 'Image', category: 'Media', EditComponent: ImageEdit },
    { tagName: 'Embed', category: 'Media', EditComponent: EmbedEdit },
    { tagName: 'Latex', category: 'Media', label: 'LaTeX', EditComponent: LatexEdit },
]

export function splitTagName(tagName: string): string {
    return tagName.replace(/([a-z])([A-Z])/g, '$1 $2')
}

export function getUnknownStringProp(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function summarizeTitle(value: string | null | undefined): string | null {
    const oneLineValue = value?.replace(/\s+/g, ' ').trim()
    if (!oneLineValue) {
        return null
    }
    return oneLineValue.length > 120 ? `${oneLineValue.slice(0, 117)}...` : oneLineValue
}

export function getMarkdownNotebookNodeTitle(
    node: NotebookComponentBlockNode,
    nodeType: NotebookNodeType | undefined,
    fallback: string
): string | null {
    const explicitTitle = getUnknownStringProp(node.props?.title)
    if (explicitTitle) {
        return explicitTitle
    }
    if (nodeType === NotebookNodeType.Embed) {
        return getUnknownStringProp(node.props?.src) ?? fallback
    }
    if (nodeType === NotebookNodeType.Image) {
        return getUnknownStringProp(node.props?.alt) ?? getUnknownStringProp(node.props?.src) ?? fallback
    }
    return getUnknownStringProp(node.props?.name) ?? getUnknownStringProp(node.props?.id) ?? fallback
}

export const NOTEBOOK_MARKDOWN_REGISTRY: NotebookComponentRegistry = createMarkdownNotebookRegistry(
    MARKDOWN_NODE_DEFINITIONS.map((definition) => {
        const nodeType = MARKDOWN_TAG_TO_NOTEBOOK_NODE_TYPE[definition.tagName]
        const label = definition.label ?? splitTagName(definition.tagName)

        return {
            tagName: definition.tagName,
            label,
            category: definition.category,
            icon: nodeType ? NODE_ICONS[nodeType] : undefined,
            defaultProps: () => ({ nodeId: uuid() }),
            ViewComponent: DataNodeShell,
            EditComponent: definition.EditComponent ?? DataNodeShell,
            exclusiveEditPanel: definition.exclusiveEditPanel,
            // Only explicit insert commands appear in `/`. Empty `{}` used to leak PostHog nodes.
            insertCommand: definition.insertCommand,
            getTitle: (node: NotebookComponentBlockNode) =>
                getMarkdownNotebookNodeTitle(node, nodeType, label),
        }
    })
)
