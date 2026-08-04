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
        <div className="w-[440px] p-5 space-y-5 bg-[#111216] rounded-xl shadow-2xl text-xs text-slate-200">
            {/* Top Bar Header - No Border */}
            <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2 font-semibold text-white text-sm">
                    <IconOpenSidebar className="w-4 h-4 text-slate-400" />
                    <span>Publish & Cover Settings</span>
                </div>
                <button
                    onClick={() => setIsPublished(!isPublished)}
                    className="cursor-pointer transition-transform active:scale-95"
                >
                    <LemonTag type={isPublished ? 'success' : 'highlight'}>
                        {isPublished ? 'Published' : 'Draft'}
                    </LemonTag>
                </button>
            </div>

            {/* Single Cover Image URL Field */}
            <div className="space-y-1.5">
                <label className="font-semibold text-white">Cover Image URL</label>
                <LemonInput
                    value={coverUrl}
                    onChange={(val) => setCoverUrl(val)}
                    placeholder="Paste image URL (e.g. https://images.unsplash.com/...)"
                    size="small"
                />
            </div>

            {/* Live Cover Banner Display - Shown ONLY when URL is entered - No Border */}
            {hasCoverUrl && (
                <div className="space-y-2 transition-all duration-300 animate-fadeIn">
                    <label className="font-semibold text-white flex items-center gap-1.5 text-xs">
                        <IconImage className="w-3.5 h-3.5 text-[#1d4ed8]" />
                        Cover Banner Preview
                    </label>

                    <div className="relative h-32 w-full rounded-lg overflow-hidden bg-[#1d1e24] shadow-md group">
                        <img
                            src={coverUrl}
                            alt="Notebook cover preview"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                            <span className="text-white font-semibold text-sm drop-shadow truncate">
                                {title || 'Untitled Notebook'}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Public Title Input */}
            <div className="space-y-1.5">
                <label className="font-semibold text-white">Public Title</label>
                <LemonInput
                    value={title}
                    onChange={setTitle}
                    placeholder="Public notebook title..."
                    size="small"
                />
            </div>

            {/* Category & Status Row */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="font-semibold text-white">Category</label>
                    <LemonSelect
                        size="small"
                        value={category}
                        onChange={(val) => setCategory(val || 'engineering')}
                        options={[
                            { value: 'engineering', label: 'Engineering & RCA' },
                            { value: 'product', label: 'Product Spec' },
                            { value: 'analytics', label: 'HogQL Telemetry' },
                            { value: 'research', label: 'User Research' },
                        ]}
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="font-semibold text-white">Publishing Status</label>
                    <LemonSelect
                        size="small"
                        value={isPublished ? 'published' : 'draft'}
                        onChange={(val) => setIsPublished(val === 'published')}
                        options={[
                            { value: 'draft', label: 'Draft Mode' },
                            { value: 'published', label: 'Published' },
                        ]}
                    />
                </div>
            </div>

            {/* Subtitle / Summary Input */}
            <div className="space-y-1.5">
                <label className="font-semibold text-white">Subtitle / Summary</label>
                <LemonInput
                    value={subtitle}
                    onChange={setSubtitle}
                    placeholder="Brief summary for team readers..."
                    size="small"
                />
            </div>

            {/* Actions Footer - No Border */}
            <div className="pt-2 flex items-center justify-between">
                <div className="flex gap-1.5">
                    <LemonButton
                        type="stealth"
                        size="small"
                        icon={<IconSparkles className="text-orange-400" />}
                        onClick={() => {
                            setIsOpen(false)
                            if (onOpenAI) onOpenAI()
                        }}
                        tooltip="Ask PostHog AI Assistant"
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

                <div className="flex gap-2">
                    <LemonButton
                        type="secondary"
                        size="small"
                        onClick={() => setIsOpen(false)}
                    >
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
    )

    return (
        <LemonDropdown
            overlay={overlay}
            visible={isOpen}
            onVisibilityChange={(v) => setIsOpen(v)}
            onClickOutside={() => setIsOpen(false)}
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
