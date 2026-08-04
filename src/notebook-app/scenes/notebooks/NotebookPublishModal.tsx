import { useState } from 'react'
import { LemonModal, LemonInput, LemonButton, LemonTag, LemonSelect } from '@posthog/lemon-ui'
import { IconShare, IconSparkles, IconPlus, IconCheck } from '@posthog/icons'

interface NotebookPublishModalProps {
    isOpen: boolean
    onClose: () => void
    notebookTitle: string
    onPublishSuccess?: (metadata: any) => void
}

const PRESET_COVERS = [
    'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80',
]

export function NotebookPublishModal({
    isOpen,
    onClose,
    notebookTitle,
    onPublishSuccess,
}: NotebookPublishModalProps) {
    const [title, setTitle] = useState(notebookTitle || 'Untitled Notebook')
    const [subtitle, setSubtitle] = useState('Comprehensive analysis and team release guide')
    const [coverImage, setCoverImage] = useState(PRESET_COVERS[0])
    const [category, setCategory] = useState('engineering')
    const [tags, setTags] = useState('posthog, release, analytics')
    const [isPublished, setIsPublished] = useState(false)
    const [savedSuccess, setSavedSuccess] = useState(false)

    if (!isOpen) return null

    const handleSave = () => {
        setIsPublished(true)
        setSavedSuccess(true)
        if (onPublishSuccess) {
            onPublishSuccess({ title, subtitle, coverImage, category, tags, isPublished: true })
        }
        setTimeout(() => {
            setSavedSuccess(false)
            onClose()
        }, 1500)
    }

    return (
        <LemonModal
            isOpen={isOpen}
            onClose={onClose}
            title="Publish & Notebook Meta Settings (Yayınlama ve Görsel Ayarları)"
            width={640}
        >
            <div className="space-y-5 p-1 text-sm">
                {/* Banner / Cover Image Preview */}
                <div className="space-y-2">
                    <label className="font-semibold text-primary block">Main Cover Banner (Ana Görsel)</label>
                    <div className="relative h-40 w-full rounded-lg overflow-hidden border border-border bg-surface-secondary shadow-inner">
                        {coverImage ? (
                            <img src={coverImage} alt="Cover preview" className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted space-y-1">
                                <IconPlus className="w-6 h-6" />
                                <span>No cover image selected</span>
                            </div>
                        )}
                        <div className="absolute bottom-2 right-2 flex gap-2">
                            <LemonButton
                                type="secondary"
                                size="small"
                                className="bg-surface-primary/90 backdrop-blur"
                                onClick={() => setCoverImage(PRESET_COVERS[Math.floor(Math.random() * PRESET_COVERS.length)])}
                            >
                                Shuffle Preset Cover
                            </LemonButton>
                        </div>
                    </div>
                </div>

                {/* Custom Image URL */}
                <div className="space-y-1.5">
                    <label className="font-medium text-secondary text-xs">Custom Cover Image URL</label>
                    <LemonInput
                        value={coverImage}
                        onChange={setCoverImage}
                        placeholder="https://images.unsplash.com/..."
                        size="small"
                    />
                </div>

                {/* Metadata Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="font-semibold text-primary">Public Title (Yayın Başlığı)</label>
                        <LemonInput value={title} onChange={setTitle} size="small" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="font-semibold text-primary">Category (Kategori)</label>
                        <LemonSelect
                            size="small"
                            value={category}
                            onChange={(val) => setCategory(val || 'engineering')}
                            options={[
                                { value: 'engineering', label: '🛠️ Engineering & RCA' },
                                { value: 'product', label: '🚀 Product Release Plan' },
                                { value: 'analytics', label: '📊 HogQL Analytics & Data' },
                                { value: 'design', label: '🎨 Design & User Research' },
                            ]}
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="font-semibold text-primary">Subtitle & SEO Excerpt (Özet Metin)</label>
                    <LemonInput
                        value={subtitle}
                        onChange={setSubtitle}
                        placeholder="Short summary for readers and team members..."
                        size="small"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="font-semibold text-primary">Tags / Keywords (Etiketler)</label>
                    <LemonInput
                        value={tags}
                        onChange={setTags}
                        placeholder="comma, separated, tags"
                        size="small"
                    />
                </div>

                {/* Publishing Status Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-secondary">
                    <div className="space-y-0.5">
                        <div className="font-semibold text-primary flex items-center gap-1.5">
                            <IconShare className="w-4 h-4 text-blue-500" />
                            <span>Publish to Team & Community</span>
                        </div>
                        <p className="text-xs text-muted">
                            Makes this notebook discoverable across your workspace and public hub.
                        </p>
                    </div>
                    <LemonTag type={isPublished ? 'success' : 'highlight'}>
                        {isPublished ? 'Published 🌐' : 'Draft 📝'}
                    </LemonTag>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 pt-2 border-t border-border">
                    <LemonButton type="secondary" onClick={onClose}>
                        Cancel
                    </LemonButton>
                    <LemonButton
                        type="primary"
                        icon={savedSuccess ? <IconCheck className="text-green-500" /> : <IconShare />}
                        onClick={handleSave}
                    >
                        {savedSuccess ? 'Published Successfully!' : 'Save & Publish Meta Details'}
                    </LemonButton>
                </div>
            </div>
        </LemonModal>
    )
}
