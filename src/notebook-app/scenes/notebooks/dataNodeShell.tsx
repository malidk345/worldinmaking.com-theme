import React, { useState } from 'react'
import { LemonButton, LemonInput, LemonTag, LemonBanner } from '~nb-lib/lemon-ui/index'
import { NotebookComponentRenderProps } from '../../lib/components/MarkdownNotebook/types'
import { NotebookNodeType } from './types'
import { NODE_ICONS } from './nodeIcons'

const INTERNAL_KEYS = new Set(['height', 'nodeId', '__init', 'children', 'tabId', 'placement'])

export const NUMERIC_MARKDOWN_NODE_ATTRIBUTE_KEYS: Partial<Record<NotebookNodeType, string[]>> = {
    [NotebookNodeType.Cohort]: ['id'],
    [NotebookNodeType.Experiment]: ['id'],
    [NotebookNodeType.Group]: ['groupTypeIndex'],
}

export const MARKDOWN_NODE_ATTRIBUTE_LABELS: Partial<Record<NotebookNodeType, Record<string, string>>> = {
    [NotebookNodeType.Cohort]: {
        id: 'Cohort ID',
    },
    [NotebookNodeType.EarlyAccessFeature]: {
        id: 'Early access feature ID',
    },
    [NotebookNodeType.Experiment]: {
        id: 'Experiment ID',
    },
    [NotebookNodeType.FeatureFlag]: {
        id: 'Feature flag ID or key',
    },
    [NotebookNodeType.FeatureFlagCodeExample]: {
        id: 'Feature flag ID or key',
    },
    [NotebookNodeType.Group]: {
        groupTypeIndex: 'Group type index',
        id: 'Group key',
    },
    [NotebookNodeType.Person]: {
        distinctId: 'Distinct ID',
        id: 'Person UUID',
    },
    [NotebookNodeType.Survey]: {
        id: 'Survey ID',
    },
    [NotebookNodeType.ZendeskTickets]: {
        groupKey: 'Group key',
        personId: 'Person UUID',
    },
}

export function DataNodeShell({ node, mode, updateProps }: NotebookComponentRenderProps): JSX.Element {
    const tagName = node.tagName
    const nodeType = tagName as NotebookNodeType
    const icon = NODE_ICONS[nodeType]
    const attributeLabels = MARKDOWN_NODE_ATTRIBUTE_LABELS[nodeType] || {}
    const numericKeys = new Set(NUMERIC_MARKDOWN_NODE_ATTRIBUTE_KEYS[nodeType] || [])

    const userAttributes = Object.entries(node.props || {}).filter(([key]) => !INTERNAL_KEYS.has(key))

    const [formValues, setFormValues] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {}
        for (const [key, val] of userAttributes) {
            initial[key] = val != null ? String(val) : ''
        }
        for (const labelKey of Object.keys(attributeLabels)) {
            if (!(labelKey in initial)) {
                initial[labelKey] = ''
            }
        }
        return initial
    })

    if (mode === 'edit') {
        return (
            <div className="p-4 border rounded bg-surface-primary space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold border-b pb-2">
                    {icon && <span className="w-5 h-5 flex items-center justify-center">{icon}</span>}
                    <span>Configure {tagName}</span>
                </div>
                <div className="space-y-3">
                    {Object.keys(formValues).length === 0 ? (
                        <p className="text-xs text-muted">No configurable parameters for this node type.</p>
                    ) : (
                        Object.keys(formValues).map((key) => {
                            const labelText = attributeLabels[key] || key
                            return (
                                <div key={key} className="space-y-1">
                                    <label className="text-xs font-medium text-secondary">{labelText}</label>
                                    <LemonInput
                                        value={formValues[key]}
                                        onChange={(val) => setFormValues((prev) => ({ ...prev, [key]: val }))}
                                        placeholder={`Enter ${labelText}`}
                                        size="small"
                                    />
                                </div>
                            )
                        })
                    )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <LemonButton
                        type="primary"
                        size="small"
                        onClick={() => {
                            const updated: Record<string, any> = {}
                            for (const [k, v] of Object.entries(formValues)) {
                                if (v.trim() !== '') {
                                    updated[k] = numericKeys.has(k) ? Number(v) || v : v
                                }
                            }
                            updateProps(updated)
                        }}
                    >
                        Save
                    </LemonButton>
                </div>
            </div>
        )
    }

    return (
        <div className="p-3 border rounded-md bg-bg-light border-border space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {icon && <span className="w-4 h-4 text-secondary flex items-center justify-center">{icon}</span>}
                    <span className="font-semibold text-sm">{tagName}</span>
                    <LemonTag type="default" size="small">
                        PostHog Node
                    </LemonTag>
                </div>
            </div>

            {userAttributes.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs py-1">
                    {userAttributes.map(([k, v]) => (
                        <span key={k} className="bg-surface font-mono px-2 py-0.5 rounded border border-border">
                            <span className="text-muted">{attributeLabels[k] || k}:</span>{' '}
                            <span className="font-semibold">{String(v)}</span>
                        </span>
                    ))}
                </div>
            )}

            <LemonBanner type="info" size="small">
                Connect PostHog backend to view live dataset for <strong>{tagName}</strong>.
            </LemonBanner>
        </div>
    )
}
