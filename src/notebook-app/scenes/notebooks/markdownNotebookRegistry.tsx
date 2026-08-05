import React, { useRef } from 'react'
import { LemonInput, LemonTextArea } from '~nb-lib/lemon-ui/index'
import {
    COMMON_INSERT_COMMAND_CATEGORY,
    createMarkdownNotebookRegistry,
} from '../../lib/components/MarkdownNotebook'
import {
    NotebookComponentBlockNode,
    NotebookComponentDefinition,
    NotebookComponentRenderProps,
    NotebookComponentRegistry,
    NotebookPropValue,
} from '../../lib/components/MarkdownNotebook/types'
import { uuid } from '../../lib/utils/dom'
import { wasNotebookNodeJustInserted } from '../../lib/components/MarkdownNotebook/freshlyInserted'

import { NODE_ICONS } from './nodeIcons'
import { NotebookNodeType } from './types'
import { DataNodeShell } from './dataNodeShell'

export const MARKDOWN_TAG_TO_NOTEBOOK_NODE_TYPE: Partial<Record<string, NotebookNodeType>> = {
    Query: NotebookNodeType.Query,
    Python: NotebookNodeType.Python,
    PythonV2: NotebookNodeType.PythonV2,
    DuckSQL: NotebookNodeType.DuckSQL,
    HogQLSQL: NotebookNodeType.HogQLSQL,
    SQLV2: NotebookNodeType.SQLV2,
    Recording: NotebookNodeType.Recording,
    RecordingPlaylist: NotebookNodeType.RecordingPlaylist,
    FeatureFlag: NotebookNodeType.FeatureFlag,
    FeatureFlagCodeExample: NotebookNodeType.FeatureFlagCodeExample,
    Experiment: NotebookNodeType.Experiment,
    EarlyAccessFeature: NotebookNodeType.EarlyAccessFeature,
    Survey: NotebookNodeType.Survey,
    Person: NotebookNodeType.Person,
    Group: NotebookNodeType.Group,
    Cohort: NotebookNodeType.Cohort,
    Backlink: NotebookNodeType.Backlink,
    ReplayTimestamp: NotebookNodeType.ReplayTimestamp,
    Image: NotebookNodeType.Image,
    PersonFeed: NotebookNodeType.PersonFeed,
    PersonProperties: NotebookNodeType.PersonProperties,
    GroupProperties: NotebookNodeType.GroupProperties,
    Map: NotebookNodeType.Map,
    Embed: NotebookNodeType.Embed,
    Latex: NotebookNodeType.Latex,
    TaskCreate: NotebookNodeType.TaskCreate,
    LLMTrace: NotebookNodeType.LLMTrace,
    Issues: NotebookNodeType.Issues,
    UsageMetrics: NotebookNodeType.UsageMetrics,
    ZendeskTickets: NotebookNodeType.ZendeskTickets,
    RelatedGroups: NotebookNodeType.RelatedGroups,
    CustomerJourney: NotebookNodeType.CustomerJourney,
    SupportTickets: NotebookNodeType.SupportTickets,
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
    { tagName: 'Query', category: 'Insight' },
    { tagName: 'Python', category: 'Code' },
    {
        tagName: 'PythonV2',
        category: 'Code',
        label: 'Python',
        insertCommand: {
            aliases: ['python', 'py'],
            defaultProps: () => ({ nodeId: uuid() }),
        },
    },
    { tagName: 'DuckSQL', category: 'SQL', label: 'SQL (DuckDB)' },
    { tagName: 'HogQLSQL', category: 'SQL', label: 'SQL (HogQL)' },
    {
        tagName: 'SQLV2',
        category: 'SQL',
        label: 'SQL',
        insertCommand: {
            category: COMMON_INSERT_COMMAND_CATEGORY,
            aliases: ['data', 'sql'],
            defaultProps: () => ({ nodeId: uuid() }),
        },
    },
    { tagName: 'RecordingPlaylist', category: 'Data', label: 'Session recordings' },
    { tagName: 'Experiment', category: 'Experiment' },
    { tagName: 'Image', category: 'Media', EditComponent: ImageEdit },
    { tagName: 'Embed', category: 'Media', EditComponent: EmbedEdit },
    { tagName: 'Latex', category: 'Media', label: 'LaTeX', EditComponent: LatexEdit },
    { tagName: 'FeatureFlag', category: 'PostHog', label: 'Feature flag' },
    { tagName: 'Survey', category: 'PostHog' },
    { tagName: 'Person', category: 'Data' },
    { tagName: 'Group', category: 'Data' },
    { tagName: 'Cohort', category: 'Data' },
    { tagName: 'Map', category: 'Data' },
    { tagName: 'Recording', category: 'Data' },
    { tagName: 'Backlink', category: 'PostHog' },
    { tagName: 'ReplayTimestamp', category: 'PostHog' },
    { tagName: 'PersonFeed', category: 'Data' },
    { tagName: 'PersonProperties', category: 'Data' },
    { tagName: 'GroupProperties', category: 'Data' },
    { tagName: 'TaskCreate', category: 'PostHog' },
    { tagName: 'LLMTrace', category: 'PostHog' },
    { tagName: 'Issues', category: 'PostHog' },
    { tagName: 'UsageMetrics', category: 'PostHog' },
    { tagName: 'ZendeskTickets', category: 'PostHog' },
    { tagName: 'RelatedGroups', category: 'PostHog' },
    { tagName: 'CustomerJourney', category: 'PostHog' },
    { tagName: 'SupportTickets', category: 'PostHog' },
    { tagName: 'EarlyAccessFeature', category: 'PostHog', label: 'Early access feature' },
    {
        tagName: 'FeatureFlagCodeExample',
        category: 'PostHog',
        label: 'Feature flag code example',
    },
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

export function getNotebookStringProp(value: NotebookPropValue | undefined): string | null {
    return typeof value === 'string' ? value : null
}

export function getNotebookObjectProp(value: NotebookPropValue | undefined): Record<string, NotebookPropValue> | null {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null
}

export function getSeriesTitle(query: Record<string, NotebookPropValue>): string | null {
    const series = query.series
    if (!Array.isArray(series)) {
        return null
    }

    const events = series
        .map((seriesItem) => {
            const seriesObject = getNotebookObjectProp(seriesItem)
            return getNotebookStringProp(seriesObject?.event)
        })
        .filter(Boolean)

    return events.length ? events.join(', ') : null
}

export function getQueryTitle(queryValue: unknown): string | null {
    if (!queryValue || typeof queryValue !== 'object' || Array.isArray(queryValue)) {
        return null
    }

    const query = queryValue as Record<string, NotebookPropValue>
    const source = getNotebookObjectProp(query.source)
    const queryKind = getNotebookStringProp(query.kind)
    const sourceKind = getNotebookStringProp(source?.kind)

    if (queryKind === 'SavedInsightNode') {
        return getNotebookStringProp(query.name) ?? getNotebookStringProp(query.shortId) ?? 'Saved insight'
    }
    if (sourceKind === 'TrendsQuery') {
        return source ? (getSeriesTitle(source) ?? 'Trend') : 'Trend'
    }
    if (sourceKind === 'FunnelsQuery') {
        return 'Funnel'
    }
    if (sourceKind === 'EventsQuery') {
        return 'Events'
    }
    if (sourceKind === 'ActorsQuery') {
        return 'People'
    }

    return null
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

    if (nodeType === NotebookNodeType.Query) {
        return getQueryTitle(node.props?.query)
    }
    if (nodeType === NotebookNodeType.Embed) {
        return getUnknownStringProp(node.props?.src) ?? fallback
    }
    if (nodeType === NotebookNodeType.Image) {
        return getUnknownStringProp(node.props?.alt) ?? getUnknownStringProp(node.props?.src) ?? fallback
    }
    if (
        nodeType === NotebookNodeType.Python ||
        nodeType === NotebookNodeType.PythonV2 ||
        nodeType === NotebookNodeType.DuckSQL ||
        nodeType === NotebookNodeType.HogQLSQL
    ) {
        return fallback
    }

    return (
        getUnknownStringProp(node.props?.name) ??
        getUnknownStringProp(node.props?.id) ??
        fallback
    )
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
            insertCommand: definition.insertCommand ?? {},
            getTitle: (node: NotebookComponentBlockNode) =>
                getMarkdownNotebookNodeTitle(node, nodeType, label),
        }
    })
)
