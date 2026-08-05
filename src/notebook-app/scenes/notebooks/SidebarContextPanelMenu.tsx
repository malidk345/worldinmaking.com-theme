import { useState, useEffect } from 'react'
import { LemonDropdown, LemonButton, LemonTag, LemonInput, LemonSelect } from '~nb-lib/lemon-ui/index'
import { IconOpenSidebar, IconShare, IconCheck, IconPlus, IconSparkles, IconImage } from '@posthog/icons'
import { useSiteThemeSync } from '../../lib/useSiteThemeSync'

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
    const hostTheme = useSiteThemeSync()
    const isDark = hostTheme === 'dark'
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
    const [isNarrow, setIsNarrow] = useState(false)
    useEffect(() => {
        const sync = () => setIsNarrow(window.innerWidth < 640)
        sync()
        window.addEventListener('resize', sync)
        return () => window.removeEventListener('resize', sync)
    }, [])

    return (
        <LemonDropdown
            visible={isOpen}
            onClickOutside={() => setIsOpen(false)}
            closeOnClickInside={false}
            padded={false}
            dropdownPlacement={isNarrow ? 'top' : 'bottom-end'}
            fallbackPlacements={
                isNarrow
                    ? ['top', 'bottom', 'top-start', 'top-end']
                    : ['bottom-end', 'bottom-start', 'top-end', 'top-start']
            }
            className={`notebook-popover-panel notebook-app-scope ${isDark ? 'dark' : ''}`}
            overlay={
                <div className="notebook-popover-body notebook-popover-body--compact" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between gap-2 pb-1 min-w-0 shrink-0">
                        <div className="flex items-center gap-2 font-semibold text-primary text-sm min-w-0">
                            <IconOpenSidebar className="w-4 h-4 text-muted shrink-0" />
                            <span className="truncate">Publish & Cover</span>
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

                    <div className="space-y-1.5">
                        <label className="font-semibold text-primary text-xs">Cover Image URL</label>
                        <LemonInput
                            value={coverUrl}
                            onChange={(val) => setCoverUrl(val)}
                            placeholder="https://…"
                            size="small"
                        />
                    </div>

                    {hasCoverUrl && (
                        <div className="space-y-2">
                            <label className="font-semibold text-primary flex items-center gap-1.5 text-xs">
                                <IconImage className="w-3.5 h-3.5 text-[var(--color-accent,#1d4ed8)]" />
                                Cover preview
                            </label>
                            <div className="relative h-24 sm:h-28 w-full rounded-lg overflow-hidden bg-accent">
                                <img
                                    src={coverUrl}
                                    alt="Notebook cover preview"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
                                    <span className="text-white font-semibold text-sm drop-shadow truncate">
                                        {title || 'Untitled Notebook'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="font-semibold text-primary text-xs">Public Title</label>
                        <LemonInput
                            value={title}
                            onChange={setTitle}
                            placeholder="Public notebook title…"
                            size="small"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5 min-w-0">
                            <label className="font-semibold text-primary text-xs">Category</label>
                            <LemonSelect
                                size="small"
                                value={category}
                                onChange={(val) => setCategory(val || 'engineering')}
                                fullWidth
                                options={[
                                    { value: 'engineering', label: 'Engineering & RCA' },
                                    { value: 'product', label: 'Product Spec' },
                                    { value: 'analytics', label: 'HogQL Telemetry' },
                                    { value: 'research', label: 'User Research' },
                                ]}
                            />
                        </div>

                        <div className="space-y-1.5 min-w-0">
                            <label className="font-semibold text-primary text-xs">Status</label>
                            <LemonSelect
                                size="small"
                                value={isPublished ? 'published' : 'draft'}
                                onChange={(val) => setIsPublished(val === 'published')}
                                fullWidth
                                options={[
                                    { value: 'draft', label: 'Draft Mode' },
                                    { value: 'published', label: 'Published' },
                                ]}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="font-semibold text-primary text-xs">Subtitle / Summary</label>
                        <LemonInput
                            value={subtitle}
                            onChange={setSubtitle}
                            placeholder="Brief summary…"
                            size="small"
                        />
                    </div>

                    <div className="pt-1 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2">
                        <div className="flex gap-1.5">
                            <LemonButton
                                type="stealth"
                                size="small"
                                icon={<IconSparkles className="text-[var(--color-accent,#1d4ed8)]" />}
                                onClick={() => {
                                    setIsOpen(false)
                                    if (onOpenAI) onOpenAI()
                                }}
                                tooltip="Ask AI"
                            />
                            <LemonButton
                                type="stealth"
                                size="small"
                                icon={<IconPlus />}
                                onClick={() => {
                                    setIsOpen(false)
                                    if (onCreateNew) onCreateNew()
                                }}
                                tooltip="Create new notebook"
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <LemonButton type="secondary" size="small" onClick={() => setIsOpen(false)}>
                                Cancel
                            </LemonButton>
                            <LemonButton
                                type="primary"
                                size="small"
                                icon={savedSuccess ? <IconCheck className="text-green-400" /> : <IconShare />}
                                onClick={handleSave}
                            >
                                {savedSuccess ? 'Published!' : 'Save & Publish'}
                            </LemonButton>
                        </div>
                    </div>
                </div>
            }
        >
            <LemonButton
                type="secondary"
                size="small"
                icon={<IconOpenSidebar />}
                onClick={() => setIsOpen(!isOpen)}
                tooltip="Publish & cover settings"
            >
                <span className="hidden sm:inline font-medium">Publish</span>
            </LemonButton>
        </LemonDropdown>
    )
}
