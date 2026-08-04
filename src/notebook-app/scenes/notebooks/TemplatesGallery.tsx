import React from 'react'
import { LemonButton, LemonTag } from '@posthog/lemon-ui'
import { IconRocket, IconGraph, IconFlask, IconFlag, IconRewindPlay, IconRetention, IconFunnels } from '@posthog/icons'
import { StoredNotebook, getNotebooks } from './notebookStorage'

interface TemplatesGalleryProps {
    onSelectTemplate: (template: StoredNotebook) => void
}

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
    'template-introduction': <IconFlask className="text-emerald-500" />,
    'template-feature-release': <IconRocket className="text-blue-500" />,
    'template-root-cause': <IconRewindPlay className="text-amber-500" />,
    'template-sql-report': <IconGraph className="text-purple-500" />,
    'template-session-replay': <IconRewindPlay className="text-rose-500" />,
    'template-ab-test': <IconFunnels className="text-teal-500" />,
    'template-retention': <IconRetention className="text-indigo-500" />,
    'template-feature-flag': <IconFlag className="text-orange-500" />,
}

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
    'template-introduction': 'Learn how to use PostHog Notebooks with this interactive guide covering all key features.',
    'template-feature-release': 'Coordinate feature flag rollouts, define metrics, and track rollout progress.',
    'template-root-cause': 'Document incident investigations with session replays, timelines, and action items.',
    'template-sql-report': 'Run HogQL queries, explore data, and build interactive analytics reports.',
    'template-session-replay': 'Investigate user behavior with session recordings, error tracking, and replay analysis.',
    'template-ab-test': 'Plan and analyze A/B tests with experiment configuration, metrics, and results.',
    'template-retention': 'Deep dive into user retention with cohort analysis, lifecycle, and engagement metrics.',
    'template-feature-flag': 'Track feature flag usage, rollout strategies, and code examples.',
}

function getTemplateDescription(id: string): string {
    return TEMPLATE_DESCRIPTIONS[id] || 'A PostHog notebook template to jumpstart your investigation.'
}

function getTemplateIcon(id: string): React.ReactNode {
    return TEMPLATE_ICONS[id] || <IconFlask className="text-emerald-500" />
}

export function TemplatesGallery({ onSelectTemplate }: TemplatesGalleryProps): JSX.Element {
    const templates = getNotebooks().filter((nb) => nb.isTemplate || nb.id.startsWith('template-'))

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold m-0">Notebook Templates</h2>
                <p className="text-sm text-muted mt-1">
                    Get started quickly with a pre-built template. Each template includes PostHog-specific blocks
                    for insights, replays, feature flags, and more.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                    <div
                        key={template.id}
                        className="border border-border rounded-lg p-4 flex flex-col justify-between hover:border-primary hover:shadow-sm transition-all cursor-pointer bg-bg-light"
                        onClick={() => onSelectTemplate(template)}
                    >
                        <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{getTemplateIcon(template.id)}</span>
                                    <h3 className="font-semibold text-sm m-0 leading-tight">{template.title}</h3>
                                </div>
                                <LemonTag type="highlight" size="small">Template</LemonTag>
                            </div>
                            <p className="text-xs text-muted leading-relaxed m-0">
                                {getTemplateDescription(template.id)}
                            </p>
                        </div>

                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
                            <span className="text-[11px] text-muted">by PostHog</span>
                            <LemonButton
                                type="primary"
                                size="small"
                                onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation()
                                    onSelectTemplate(template)
                                }}
                            >
                                Create copy
                            </LemonButton>
                        </div>
                    </div>
                ))}
            </div>

            {templates.length === 0 && (
                <div className="text-center py-12 text-muted">
                    <p className="text-sm">No templates available.</p>
                </div>
            )}
        </div>
    )
}
