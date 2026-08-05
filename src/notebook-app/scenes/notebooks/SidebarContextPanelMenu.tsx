import { useState } from 'react'
import { LemonTag, LemonInput, LemonSelect } from '~nb-lib/lemon-ui/index'
import { IconOpenSidebar, IconShare, IconCheck, IconPlus, IconSparkles, IconImage } from '@posthog/icons'
import { useSiteThemeSync } from '../../lib/useSiteThemeSync'
import { Popover } from 'components/RadixUI/Popover'
import OSButton from 'components/OSButton'

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

    // Same shell as Display Options / OS Header file menu
    const contentClassName =
        'w-[min(100vw-1rem,24rem)] sm:w-[min(96vw,28rem)] max-h-[min(78dvh,36rem)] overflow-hidden p-0 border border-primary'

    return (
        <Popover
            open={isOpen}
            onOpenChange={setIsOpen}
            dataScheme="primary"
            side="bottom"
            sideOffset={8}
            contentClassName={contentClassName}
            trigger={
                <OSButton
                    size="md"
                    icon={<IconOpenSidebar className="size-4" />}
                    hover="background"
                    active={isOpen}
                    tooltip="Publish & cover settings"
                >
                    <span className="hidden sm:inline font-medium">Publish</span>
                </OSButton>
            }
        >
            <div
                className={`notebook-app-scope flex flex-col gap-3 p-3 max-h-[min(78dvh,36rem)] overflow-y-auto overscroll-contain ${
                    hostTheme === 'dark' ? 'dark' : ''
                }`}
                data-host-theme={hostTheme}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-2 pb-1 min-w-0 shrink-0 border-b border-primary">
                    <div className="flex items-center gap-2 font-semibold text-primary text-sm min-w-0">
                        <IconOpenSidebar className="w-4 h-4 text-secondary shrink-0" />
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
                            <IconImage className="w-3.5 h-3.5 text-secondary" />
                            Cover preview
                        </label>
                        <div className="relative h-24 sm:h-28 w-full rounded overflow-hidden bg-accent border border-primary">
                            <img src={coverUrl} alt="Notebook cover preview" className="w-full h-full object-cover" />
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

                <div className="pt-1 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-primary">
                    <div className="flex gap-1.5">
                        <OSButton
                            size="sm"
                            icon={<IconSparkles className="size-4" />}
                            hover="background"
                            onClick={() => {
                                setIsOpen(false)
                                if (onOpenAI) onOpenAI()
                            }}
                            tooltip="Ask AI"
                        />
                        <OSButton
                            size="sm"
                            icon={<IconPlus className="size-4" />}
                            hover="background"
                            onClick={() => {
                                setIsOpen(false)
                                if (onCreateNew) onCreateNew()
                            }}
                            tooltip="Create new notebook"
                        />
                    </div>

                    <div className="flex gap-2 justify-end">
                        <OSButton size="md" hover="background" onClick={() => setIsOpen(false)}>
                            Cancel
                        </OSButton>
                        <OSButton
                            size="md"
                            variant="primary"
                            icon={savedSuccess ? <IconCheck className="size-4" /> : <IconShare className="size-4" />}
                            onClick={handleSave}
                        >
                            {savedSuccess ? 'Published!' : 'Save & Publish'}
                        </OSButton>
                    </div>
                </div>
            </div>
        </Popover>
    )
}
