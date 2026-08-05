import { useState } from 'react'
import { LemonDropdown, LemonButton, LemonTag, LemonInput, LemonSelect } from '~nb-lib/lemon-ui/index'
import { IconOpenSidebar, IconShare, IconCheck, IconPlus, IconSparkles, IconImage } from '@posthog/icons'

interface SidebarContextPanelMenuProps {
    notebookTitle?: string
    onOpenAI?: () => void
    onCreateNew?: () => void
}

export function SidebarContextPanelMenu({
    notebookTitle = 'Untitled Notebook',
    onOpenAI,
    onCreateNew,
}: SidebarContextPanelMenuProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [title, setTitle] = useState(notebookTitle)
    const [subtitle, setSubtitle] = useState('Production release specifications & telemetry RCA log')
    const [coverUrl, setCoverUrl] = useState('')
    const [category, setCategory] = useState('engineering')
    const [isPublished, setIsPublished] = useState(false)
    const [savedSuccess, setSavedSuccess] = useState(false)

    const handleSave = () => {
        setIsPublished(true)
        setSavedSuccess(true)
        setTimeout(() => {
            setSavedSuccess(false)
            setIsOpen(false)
        }, 1200)
    }

    const hasCoverUrl = Boolean(coverUrl && coverUrl.trim().length > 0)

    const overlay = (
    const overlay = (
        <div className="w-[min(380px,92vw)] text-xs text-primary">
            <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <IconOpenSidebar className="w-4 h-4 text-muted shrink-0" />
                    <div className="min-w-0">
                        <div className="font-semibold text-sm leading-none">Publish settings</div>
                        <p className="text-[11px] text-muted mt-1 mb-0 truncate">Cover, title & visibility</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setIsPublished(!isPublished)}
                    className="cursor-pointer transition-transform active:scale-95 shrink-0"
                >
                    <LemonTag type={isPublished ? 'success' : 'highlight'}>
                        {isPublished ? 'Published' : 'Draft'}
                    </LemonTag>
                </button>
            </div>

            <div className="px-3 pb-3 space-y-3">
                <div className="space-y-1">
                    <label className="font-medium text-secondary">Cover image URL</label>
                    <LemonInput
                        value={coverUrl}
                        onChange={setCoverUrl}
                        placeholder="https://images.unsplash.com/..."
                        size="small"
                        fullWidth
                    />
                </div>

                {hasCoverUrl && (
                    <div className="relative h-28 w-full rounded-lg overflow-hidden bg-surface-secondary group">
                        <img
                            src={coverUrl}
                            alt="Notebook cover preview"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent flex items-end p-2.5">
                            <span className="text-white font-semibold text-xs drop-shadow truncate flex items-center gap-1">
                                <IconImage className="w-3 h-3" />
                                {title || 'Untitled Notebook'}
                            </span>
                        </div>
                    </div>
                )}

                <div className="space-y-1">
                    <label className="font-medium text-secondary">Public title</label>
                    <LemonInput
                        value={title}
                        onChange={setTitle}
                        placeholder="Public notebook title..."
                        size="small"
                        fullWidth
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <label className="font-medium text-secondary">Category</label>
                        <LemonSelect
                            size="small"
                            fullWidth
                            value={category}
                            onChange={(val) => setCategory(val || 'engineering')}
                            options={[
                                { value: 'engineering', label: 'Engineering' },
                                { value: 'product', label: 'Product' },
                                { value: 'analytics', label: 'Analytics' },
                                { value: 'research', label: 'Research' },
                            ]}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="font-medium text-secondary">Status</label>
                        <LemonSelect
                            size="small"
                            fullWidth
                            value={isPublished ? 'published' : 'draft'}
                            onChange={(val) => setIsPublished(val === 'published')}
                            options={[
                                { value: 'draft', label: 'Draft' },
                                { value: 'published', label: 'Published' },
                            ]}
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="font-medium text-secondary">Subtitle</label>
                    <LemonInput
                        value={subtitle}
                        onChange={setSubtitle}
                        placeholder="Brief summary for readers..."
                        size="small"
                        fullWidth
                    />
                </div>
            </div>

            <div className="px-3 py-2.5 border-t border-border flex items-center justify-between gap-2">
                <div className="flex gap-0.5">
                    <LemonButton
                        type="tertiary"
                        size="xsmall"
                        icon={<IconSparkles className="text-orange" />}
                        onClick={() => {
                            setIsOpen(false)
                            onOpenAI?.()
                        }}
                        tooltip="Ask AI"
                    />
                    <LemonButton
                        type="tertiary"
                        size="xsmall"
                        icon={<IconPlus />}
                        onClick={() => {
                            setIsOpen(false)
                            onCreateNew?.()
                        }}
                        tooltip="New notebook"
                    />
                </div>
                <div className="flex gap-1.5">
                    <LemonButton type="secondary" size="small" onClick={() => setIsOpen(false)}>
                        Cancel
                    </LemonButton>
                    <LemonButton
                        type="primary"
                        size="small"
                        icon={savedSuccess ? <IconCheck /> : <IconShare />}
                        onClick={handleSave}
                    >
                        {savedSuccess ? 'Saved' : 'Publish'}
                    </LemonButton>
                </div>
            </div>
        </div>
    )

    return (
        <LemonDropdown
            overlay={overlay}
            visible={isOpen}
            onVisibilityChange={(v) => setIsOpen(v)}
            onClickOutside={() => setIsOpen(false)}
            closeOnClickInside={false}
        >
            <LemonButton
                type="secondary"
                size="small"
                icon={<IconOpenSidebar />}
                tooltip="Open publish & cover meta dropdown"
            >
                <span className="hidden lg:inline font-medium">Open in context panel</span>
            </LemonButton>
        </LemonDropdown>
    )
}
