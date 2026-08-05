import { useState } from 'react'
import {
    LemonDropdown,
    LemonButton,
    LemonInput,
    LemonSelect,
    LemonTag,
} from '~nb-lib/lemon-ui/index'
import { IconOpenSidebar, IconShare, IconCheck, IconPlus, IconSparkles, IconImage } from '@posthog/icons'
import { useSiteThemeSync } from '../../lib/useSiteThemeSync'

interface SidebarContextPanelMenuProps {
    notebookTitle?: string
    onOpenAI?: () => void
    onCreateNew?: () => void
}

/**
 * Content layout matches CollaboratorsBanner / NotebookSelectButton.
 * Shell (bg, border, radius, shadow) comes from Lemon Popover__box — do not re-chrome here.
 */
const panelClassName =
    'w-[min(100vw-1.5rem,24rem)] sm:w-80 max-h-[min(78dvh,36rem)] p-2 sm:p-3 space-y-3 text-xs overflow-y-auto overscroll-contain'

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

    const overlay = (
        <div className={panelClassName} onClick={(e) => e.stopPropagation()}>
            {/* Header — same structure as CollaboratorsBanner */}
            <div className="flex items-center justify-between border-b border-border pb-2 gap-2">
                <div className="flex items-center gap-1.5 font-semibold text-primary min-w-0">
                    <IconOpenSidebar className="w-4 h-4 text-muted shrink-0" />
                    <span className="truncate">Publish & Cover</span>
                </div>
                <button
                    type="button"
                    onClick={() => setIsPublished(!isPublished)}
                    className="cursor-pointer shrink-0"
                >
                    <LemonTag type={isPublished ? 'success' : 'highlight'}>
                        {isPublished ? 'Published' : 'Draft'}
                    </LemonTag>
                </button>
            </div>

            <div className="space-y-1.5">
                <label className="font-semibold text-primary">Cover Image URL</label>
                <LemonInput
                    value={coverUrl}
                    onChange={(val) => setCoverUrl(val)}
                    placeholder="https://…"
                    size="small"
                    fullWidth
                />
            </div>

            {hasCoverUrl && (
                <div className="space-y-1.5">
                    <label className="font-semibold text-primary flex items-center gap-1.5">
                        <IconImage className="w-3.5 h-3.5 text-muted" />
                        Cover preview
                    </label>
                    <div className="relative h-24 w-full rounded overflow-hidden bg-surface-secondary border border-border">
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
                <label className="font-semibold text-primary">Public Title</label>
                <LemonInput
                    value={title}
                    onChange={setTitle}
                    placeholder="Public notebook title…"
                    size="small"
                    fullWidth
                />
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5 min-w-0">
                    <label className="font-semibold text-primary">Category</label>
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
                    <label className="font-semibold text-primary">Status</label>
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
                <label className="font-semibold text-primary">Subtitle / Summary</label>
                <LemonInput
                    value={subtitle}
                    onChange={setSubtitle}
                    placeholder="Brief summary…"
                    size="small"
                    fullWidth
                />
            </div>

            {/* Footer — same rhythm as CollaboratorsBanner */}
            <div className="border-t border-border pt-2 flex items-center justify-between gap-2">
                <div className="flex gap-1">
                    <LemonButton
                        size="xsmall"
                        type="tertiary"
                        icon={<IconSparkles />}
                        onClick={() => {
                            setIsOpen(false)
                            onOpenAI?.()
                        }}
                        tooltip="Ask AI"
                    />
                    <LemonButton
                        size="xsmall"
                        type="tertiary"
                        icon={<IconPlus />}
                        onClick={() => {
                            setIsOpen(false)
                            onCreateNew?.()
                        }}
                        tooltip="Create new notebook"
                    />
                </div>

                <div className="flex gap-1.5">
                    <LemonButton size="small" type="secondary" onClick={() => setIsOpen(false)}>
                        Cancel
                    </LemonButton>
                    <LemonButton
                        size="small"
                        type="primary"
                        icon={savedSuccess ? <IconCheck /> : <IconShare />}
                        onClick={handleSave}
                    >
                        {savedSuccess ? 'Published!' : 'Save & Publish'}
                    </LemonButton>
                </div>
            </div>
        </div>
    )

    return (
        <LemonDropdown
            overlay={overlay}
            visible={isOpen}
            onVisibilityChange={setIsOpen}
            closeOnClickInside={false}
            padded={false}
            placement="bottom-end"
            fallbackPlacements={['bottom-start', 'top-end', 'top-start']}
            className={`notebook-app-scope ${isDark ? 'dark' : ''}`}
        >
            <LemonButton
                size="small"
                type="secondary"
                icon={<IconOpenSidebar />}
                active={isOpen}
                tooltip="Publish & cover settings"
            >
                <span className="hidden sm:inline">Publish</span>
            </LemonButton>
        </LemonDropdown>
    )
}
