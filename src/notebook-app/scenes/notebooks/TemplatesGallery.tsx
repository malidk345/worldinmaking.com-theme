import React from 'react'
import { LemonButton, LemonTag } from '~nb-lib/lemon-ui/index'
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
    'template-introduction': 'A short guide to writing, publishing, and talking with philosophers in a notebook.',
    'template-feature-release': 'Plan a release: claim, audience, risks, and what to write next.',
    'template-root-cause': 'Document an investigation with a timeline, evidence, and next actions.',
    'template-sql-report': 'Scratchpad for notes, tables, and follow-up questions.',
    'template-session-replay': 'Walk through a case with quotes, context, and a short verdict.',
    'template-ab-test': 'Compare two positions: hypothesis, evidence, and what would change your mind.',
    'template-retention': 'Keep a running log of ideas you want to return to.',
    'template-feature-flag': 'Track a decision: options, trade-offs, and the call you made.',
}

function getTemplateDescription(id: string): string {
    return TEMPLATE_DESCRIPTIONS[id] || 'A starter structure for research and writing.'
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
                    Starter structures for research and writing. Create a blank notebook anytime from the list.
                </p>
            </div>

            {templates.length === 0 ? (
                <div className="border border-border rounded-lg p-8 text-center space-y-2 bg-bg-light">
                    <p className="text-sm text-primary font-medium m-0">No templates yet</p>
                    <p className="text-xs text-muted m-0 max-w-md mx-auto">
                        Start from <strong>Welcome to WIM</strong> in your notebooks list, or create a new notebook and
                        write freely. Templates may appear here later.
                    </p>
                </div>
            ) : null}

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
                            <span className="text-[11px] text-muted">by WIM</span>
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
