import React from 'react'
import { IconNotebook } from '@posthog/icons'
import OSButton from 'components/OSButton'
import { StoredNotebook, getNotebooks } from './notebookStorage'
import { NotebookTag } from './NotebookMeta'

interface TemplatesGalleryProps {
    onSelectTemplate: (template: StoredNotebook) => void
}

const INTRODUCTION_TEMPLATE_ID = 'template-introduction'

export function TemplatesGallery({ onSelectTemplate }: TemplatesGalleryProps): JSX.Element {
    const templates = getNotebooks().filter((nb) => nb.id === INTRODUCTION_TEMPLATE_ID)

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h2 className="text-xl font-bold m-0">Notebook template</h2>
                <p className="text-sm text-muted mt-1 mb-0">
                    A short guide to writing in a notebook. Create a blank page anytime from the list.
                </p>
            </div>

            {templates.length === 0 ? (
                <div className="border border-primary rounded bg-primary p-8 text-center space-y-2">
                    <p className="text-sm text-primary font-medium m-0">No templates yet</p>
                    <p className="text-xs text-muted m-0 max-w-md mx-auto">
                        Start from <strong>Introducing WIM Notebook</strong> in your notebooks list, or create a new notebook and
                        write freely.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {templates.map((template) => (
                        <button
                            key={template.id}
                            type="button"
                            className="border border-primary rounded-sm bg-primary p-4 flex flex-col justify-between text-left hover:bg-accent transition-colors"
                            onClick={() => onSelectTemplate(template)}
                        >
                            <div className="space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <IconNotebook className="size-5 shrink-0 text-navy" />
                                        <h3 className="font-semibold text-sm m-0 leading-tight truncate">
                                            {template.title}
                                        </h3>
                                    </div>
                                    <NotebookTag>Template</NotebookTag>
                                </div>
                                <p className="text-xs text-muted leading-relaxed m-0">
                                    How to write, insert blocks with /, ask WIM AI, and publish a page.
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-3 mt-3 border-t border-primary">
                                <span className="text-[11px] text-muted">by WIM</span>
                                <OSButton
                                    variant="primary"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onSelectTemplate(template)
                                    }}
                                >
                                    Create copy
                                </OSButton>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
