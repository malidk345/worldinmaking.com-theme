import React, { useEffect, useState } from 'react'
import { getDocumentSnapshots, type DocumentSnapshot } from '../../../../lib/indexeddb-storage'
import { IconClock, IconRestore, IconCheck, IconX } from '../../lib/icons/iconsShim'

interface VersionHistoryModalProps {
    notebookId: string
    currentContent: string
    isOpen: boolean
    onClose: () => void
    onRestoreVersion: (content: string, title?: string) => void
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
    notebookId,
    currentContent,
    isOpen,
    onClose,
    onRestoreVersion,
}) => {
    const [snapshots, setSnapshots] = useState<DocumentSnapshot[]>([])
    const [selectedSnapshot, setSelectedSnapshot] = useState<DocumentSnapshot | null>(null)
    const [loading, setLoading] = useState(true)
    const [restored, setRestored] = useState(false)

    useEffect(() => {
        if (!isOpen || !notebookId) return
        setLoading(true)
        setRestored(false)
        getDocumentSnapshots(notebookId)
            .then((list) => {
                setSnapshots(list)
                if (list.length > 0) {
                    setSelectedSnapshot(list[0])
                } else {
                    setSelectedSnapshot(null)
                }
            })
            .catch(() => setSnapshots([]))
            .finally(() => setLoading(false))
    }, [isOpen, notebookId])

    if (!isOpen) return null

    const handleRestore = () => {
        if (!selectedSnapshot) return
        onRestoreVersion(selectedSnapshot.content, selectedSnapshot.title)
        setRestored(true)
        setTimeout(() => {
            onClose()
        }, 1000)
    }

    const formatTimestamp = (ts: number) => {
        const d = new Date(ts)
        return d.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1e222b] text-[#2d3748] dark:text-[#e2e8f0] w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col border border-[#e2e8f0] dark:border-[#333d4f] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] dark:border-[#333d4f]">
                    <div className="flex items-center gap-2">
                        <IconClock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h2 className="text-lg font-semibold tracking-tight">Sürüm Geçmişi (Version History)</h2>
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-medium px-2 py-0.5 rounded-full">
                            Local-First Snapshot Engine
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                        <IconX className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Sidebar: Snapshot List */}
                    <div className="w-72 border-r border-[#e2e8f0] dark:border-[#333d4f] overflow-y-auto p-3 space-y-2 bg-[#f8fafc] dark:bg-[#181b22]">
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-1">
                            Geçmiş Sürümler ({snapshots.length})
                        </div>
                        {loading && <div className="text-xs text-gray-500 p-3">Sürümler yükleniyor...</div>}
                        {!loading && snapshots.length === 0 && (
                            <div className="text-xs text-gray-400 p-3">
                                Henüz kaydedilmiş sürüm yok. Notunuzu düzenledikçe otomatik anlık görüntüler (snapshots) buraya eklenecektir.
                            </div>
                        )}
                        {snapshots.map((snap) => {
                            const isSelected = selectedSnapshot?.id === snap.id
                            return (
                                <button
                                    key={snap.id}
                                    onClick={() => setSelectedSnapshot(snap)}
                                    className={`w-full text-left p-3 rounded-lg text-sm transition-all border ${
                                        isSelected
                                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-500/60 shadow-sm'
                                            : 'bg-white dark:bg-[#202530] border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-xs text-gray-900 dark:text-gray-100 truncate">
                                            {snap.title || 'Başlıksız Not'}
                                        </span>
                                        <span className="text-[10px] text-gray-400">
                                            {formatTimestamp(snap.timestamp)}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate">
                                        {snap.changeSummary || 'Kayıt'} • {snap.wordCount} kelime
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    {/* Right: Version Preview / Diff */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#1e222b]">
                        {selectedSnapshot ? (
                            <>
                                <div className="px-6 py-3 border-b border-[#e2e8f0] dark:border-[#333d4f] flex items-center justify-between bg-gray-50/50 dark:bg-[#232834]">
                                    <div>
                                        <div className="text-sm font-semibold">{selectedSnapshot.title}</div>
                                        <div className="text-xs text-gray-400">
                                            {formatTimestamp(selectedSnapshot.timestamp)} ({selectedSnapshot.charCount} karakter)
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleRestore}
                                        disabled={restored}
                                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow transition active:scale-95 disabled:opacity-50"
                                    >
                                        {restored ? (
                                            <>
                                                <IconCheck className="w-4 h-4 text-emerald-300" />
                                                <span>Geri Yüklendi!</span>
                                            </>
                                        ) : (
                                            <>
                                                <IconRestore className="w-4 h-4" />
                                                <span>Bu Sürüme Geri Dön</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 font-mono text-xs leading-relaxed whitespace-pre-wrap selection:bg-blue-500/20">
                                    {selectedSnapshot.content}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                                İncelemek için soldaki listeden bir sürüm seçin.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
