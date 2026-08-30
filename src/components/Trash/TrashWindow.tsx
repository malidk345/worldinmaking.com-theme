import React, { useMemo, useState } from 'react'
import { useTrash } from 'context/TrashContext'
import SEO from 'components/seo'
import OSInput from 'components/OSForm/input'
import OSButton from 'components/OSButton'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { Popover } from 'components/RadixUI/Popover'
import { AppIcon } from 'components/OSIcons/AppIcon'
import { IconTrash, IconUndo, IconPlus } from '@posthog/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export default function TrashWindow() {
    const { trashedItems, restoreItem, deletePermanently, emptyTrash, restoreAll, addSampleItem, moveToTrash } = useTrash()
    const [searchQuery, setSearchQuery] = useState('')
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'notebook' | 'app' | 'file'>('all')
    const [isDragOver, setIsDragOver] = useState(false)
    const [isConfirmOpen, setIsConfirmOpen] = useState(false)

    const filteredItems = useMemo(() => {
        let items = trashedItems || []
        if (categoryFilter !== 'all') {
            items = items.filter((item) => item.type === categoryFilter)
        }
        if (!searchQuery.trim()) return items
        const q = searchQuery.toLowerCase()
        return items.filter(
            (item) => item.label.toLowerCase().includes(q) || item.url.toLowerCase().includes(q)
        )
    }, [trashedItems, categoryFilter, searchQuery])

    const armDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setIsDragOver(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        setIsDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
        const url = e.dataTransfer.getData('text/plain')
        const label = e.dataTransfer.getData('text/label')
        if (url && url !== '/trash') {
            moveToTrash({ url, label, type: 'app' })
        }
    }

    const getItemIcon = (type: string) => {
        switch (type) {
            case 'notebook':
                return <AppIcon name="notebook" />
            case 'file':
                return <AppIcon name="doc" />
            default:
                return <AppIcon name="trash" />
        }
    }

    return (
        <div
            data-scheme="primary"
            className={`@container bg-transparent text-primary h-full flex flex-col min-h-0 transition-all ${
                isDragOver ? 'ring-2 ring-inset ring-red/50 bg-red/5' : ''
            }`}
            onDragOver={armDrop}
            onDragEnter={armDrop}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <SEO title="Trash - Çöp Kutusu" description="Trash items on worldinmaking." />

            {/* Header Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3 pb-2 flex-shrink-0 border-b border-black/5 dark:border-white/5 bg-white/40 dark:bg-black/40 backdrop-blur-md">
                <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
                    <OSInput
                        label="Search trash"
                        showLabel={false}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Çöp kutusunda ara..."
                        size="sm"
                    />
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-secondary">
                        {filteredItems.length}
                    </span>
                </div>

                {/* Category Filter Tabs */}
                <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-full text-xs font-medium">
                    {(['all', 'notebook', 'app', 'file'] as const).map((cat) => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setCategoryFilter(cat)}
                            className={`px-3 py-1 rounded-full capitalize transition-all ${
                                categoryFilter === cat
                                    ? 'bg-white dark:bg-zinc-800 text-primary shadow-sm font-semibold'
                                    : 'text-secondary hover:text-primary'
                            }`}
                        >
                            {cat === 'all' ? 'Tümü' : cat === 'notebook' ? 'Not defteri' : cat === 'app' ? 'Uygulama' : 'Dosya'}
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {trashedItems && trashedItems.length > 0 && (
                        <>
                            <OSButton size="sm" variant="underlineOnHover" onClick={restoreAll}>
                                <IconUndo className="size-4 mr-1" />
                                Tümünü Geri Yükle
                            </OSButton>

                            <Popover
                                dataScheme="primary"
                                header={false}
                                side="bottom"
                                open={isConfirmOpen}
                                onOpenChange={setIsConfirmOpen}
                                contentClassName="w-64 p-3 rounded-2xl bg-white dark:bg-zinc-900 shadow-xl border border-black/10 dark:border-white/10"
                                trigger={
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-red/10 text-red hover:bg-red/20 transition-colors flex items-center gap-1"
                                    >
                                        <IconTrash className="size-3.5" />
                                        Çöpü Boşalt
                                    </button>
                                }
                            >
                                <div className="flex flex-col gap-2">
                                    <h4 className="text-sm font-bold text-primary m-0">Çöp kutusunu boşalt?</h4>
                                    <p className="text-xs text-secondary m-0 leading-relaxed">
                                        Çöp kutusundaki tüm öğeler kalıcı olarak silinecektir. Bu işlem geri alınamaz.
                                    </p>
                                    <div className="flex items-center justify-end gap-2 mt-1">
                                        <OSButton size="sm" variant="secondary" onClick={() => setIsConfirmOpen(false)}>
                                            Vazgeç
                                        </OSButton>
                                        <OSButton
                                            size="sm"
                                            variant="danger"
                                            onClick={() => {
                                                emptyTrash()
                                                setIsConfirmOpen(false)
                                            }}
                                        >
                                            Evet, Boşalt
                                        </OSButton>
                                    </div>
                                </div>
                            </Popover>
                        </>
                    )}
                </div>
            </div>

            {/* Main List Area */}
            <ScrollArea className="flex-1 min-h-0">
                <div className="p-4">
                    {filteredItems.length === 0 ? (
                        <div className="text-center py-16 flex flex-col items-center justify-center">
                            <div className="size-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-3">
                                <IconTrash className="size-8 text-secondary opacity-60" />
                            </div>
                            <h3 className="text-base font-semibold text-primary m-0">
                                {searchQuery ? 'Sonuç bulunamadı' : 'Çöp Kutusu Boş'}
                            </h3>
                            <p className="text-xs text-secondary max-w-sm mt-1 mb-4 leading-normal">
                                {searchQuery
                                    ? 'Aramanıza uygun silinmiş öğe bulunamadı.'
                                    : 'Silinen notlar ve masaüstü öğeleri burada görüntülenir.'}
                            </p>
                            {!searchQuery && (
                                <button
                                    type="button"
                                    onClick={addSampleItem}
                                    className="px-4 py-2 rounded-full bg-primary text-inverse text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm"
                                >
                                    <IconPlus className="size-3.5" />
                                    Örnek Öğe Ekle
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filteredItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="group relative p-3 rounded-2xl bg-white/60 dark:bg-zinc-900/60 border border-black/5 dark:border-white/5 hover:border-black/15 dark:hover:border-white/15 backdrop-blur-sm shadow-sm transition-all hover:shadow-md flex flex-col justify-between"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="size-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                                            {getItemIcon(item.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1">
                                                <h4 className="text-sm font-semibold text-primary truncate m-0">
                                                    {item.label}
                                                </h4>
                                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-secondary capitalize flex-shrink-0">
                                                    {item.type}
                                                </span>
                                            </div>
                                            <p className="text-xs text-secondary truncate mt-0.5 m-0">
                                                {item.url}
                                            </p>
                                            <span className="text-[10px] text-muted mt-1 block">
                                                {dayjs(item.trashedAt).fromNow()} silindi
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-black/5 dark:border-white/5">
                                        <button
                                            type="button"
                                            onClick={() => restoreItem(item.id)}
                                            className="px-2.5 py-1 rounded-full text-xs font-medium bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 text-primary transition-colors flex items-center gap-1"
                                        >
                                            <IconUndo className="size-3" />
                                            Geri Yükle
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => deletePermanently(item.id)}
                                            className="px-2.5 py-1 rounded-full text-xs font-medium text-red hover:bg-red/10 transition-colors flex items-center gap-1"
                                        >
                                                <IconTrash className="size-3" />
                                            Kalıcı Sil
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
