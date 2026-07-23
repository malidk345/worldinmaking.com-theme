"use client"

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useBlueprints, BlueprintPost } from 'hooks/useBlueprints'
import { useApp } from 'context/App'
import { IconStack, IconDocument, IconChevronLeft, IconChevronRight, IconRefresh } from '@posthog/icons';
import { LemonButton, Spinner } from '@/components/LemonUI'
import { ScrollableShadows } from '@/components/LemonUI/ScrollableShadows'

export default function BlueprintsExplorer() {
    const { fetchHierarchy } = useBlueprints()
    const { addWindow } = useApp()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [hierarchy, setHierarchy] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<string>('')
    const [currentPage, setCurrentPage] = useState(0)
    const itemsPerPage = 15

    const loadData = async () => {
        setLoading(true)
        const data = await fetchHierarchy()
        setHierarchy(data || [])
        if (data && data.length > 0 && !activeTab) {
            setActiveTab(data[0].id)
        }
        setLoading(false)
    }

    useEffect(() => {
        loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handlePostClick = (post: BlueprintPost) => {
        addWindow({
            key: `blueprint-post-${post.id}`,
            path: `/blueprints/post/${post.slug}`,
            title: `blueprint: ${post.title.toLowerCase()}`,
        })
    }

    const currentCategory = hierarchy.find(c => c.id === activeTab) || hierarchy[0]
    
    // Flatten posts for the active category
    const currentPosts = currentCategory 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? currentCategory.lectures.flatMap((l: any) => l.posts?.map((p: any) => ({ ...p, lectureName: l.name })) || [])
        : []

    const totalPages = Math.ceil(currentPosts.length / itemsPerPage)
    const paginatedPosts = currentPosts.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)

    const tabOptions = hierarchy.map(c => ({
        value: c.id,
        label: c.name.toLowerCase()
    }))

    return (
        <div className="absolute inset-0 flex flex-col font-sans bg-[var(--bg-3000)] text-[var(--text-3000)] p-4 md:p-8">
            <div className="max-w-5xl w-full mx-auto flex flex-col h-full">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    className="flex flex-col flex-1 overflow-hidden bg-[var(--color-bg-surface-primary)] border border-[var(--border-3000)] rounded-lg shadow-sm"
                >
                    {/* 1. Header Toolbar */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-3000)] shrink-0">
                        <div className="flex items-center gap-1.5">
                            <IconStack className="w-4 h-4" />
                            <span className="text-[13px] font-bold lowercase tracking-tight">
                                blueprints
                            </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] opacity-65">
                            <span className="lowercase text-[10px] font-bold font-mono">
                                {currentPosts.length > 0 ? (currentPage * itemsPerPage) + 1 : 0}-{Math.min((currentPage + 1) * itemsPerPage, currentPosts.length)} of {currentPosts.length}
                            </span>
                            <div className="flex items-center gap-1">
                                <LemonButton
                                    size="xxsmall"
                                    type="tertiary"
                                    onClick={loadData}
                                    icon={loading ? <Spinner /> : <IconRefresh className="w-3 h-3" />}
                                />
                                <LemonButton
                                    size="xxsmall"
                                    type="tertiary"
                                    disabled={currentPage === 0 || currentPosts.length === 0}
                                    onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                                    icon={<IconChevronLeft className="w-3.5 h-3.5" />}
                                />
                                <LemonButton
                                    size="xxsmall"
                                    type="tertiary"
                                    disabled={currentPage >= totalPages - 1 || currentPosts.length === 0}
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                    icon={<IconChevronRight className="w-3.5 h-3.5" />}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2. Categorized Tabs (Single Horizontal Button Style) */}
                    {tabOptions.length > 0 && (
                        <div className="px-4 py-2 flex justify-center border-b border-[var(--border-3000)] shrink-0">
                            <div className="flex items-center w-full rounded-[var(--radius)] border border-[var(--border-3000)] overflow-hidden bg-[var(--color-bg-surface-primary)] shadow-sm">
                                {tabOptions.map((opt, idx) => (
                                    <React.Fragment key={opt.value}>
                                        <button
                                            onClick={() => { setActiveTab(opt.value); setCurrentPage(0); }}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${activeTab === opt.value ? 'bg-[var(--color-fill-3000)] text-[var(--text-3000)]' : 'bg-transparent text-[var(--muted-3000)] hover:bg-black/5 dark:hover:bg-white/5'}`}
                                        >
                                            {opt.label}
                                        </button>
                                        {idx < tabOptions.length - 1 && (
                                            <div className="w-px h-5 bg-[var(--border-3000)] shrink-0"></div>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 3. LemonTable */}
                    <div className="LemonTable flex-1 flex flex-col min-h-0" style={{ border: 'none', borderRadius: 0 }}>
                        <ScrollableShadows 
                            direction="vertical" 
                            className="flex-1 flex flex-col min-h-0"
                            innerClassName="flex-1 overflow-y-auto min-h-0"
                        >
                            {loading && hierarchy.length === 0 ? (
                                <div style={{ padding: '48px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '11px', color: 'var(--muted-3000)' }}>
                                    <Spinner size="small" />
                                    <span>loading blueprints...</span>
                                </div>
                            ) : currentPosts.length === 0 ? (
                                <div style={{ padding: '48px 0', textAlign: 'center', fontSize: '12px', color: 'var(--muted-3000)' }}>
                                    no posts found in this category
                                </div>
                            ) : (
                                <div className="LemonTable__content">
                                    <table className="w-full">
                                        <thead>
                                            <tr>
                                                <th className="LemonTable__header" style={{ width: '48px' }}>
                                                    <div className="LemonTable__header-content"><div>#</div></div>
                                                </th>
                                                <th className="LemonTable__header">
                                                    <div className="LemonTable__header-content"><div>Title</div></div>
                                                </th>
                                                <th className="LemonTable__header" style={{ width: '200px' }}>
                                                    <div className="LemonTable__header-content"><div>Lecture</div></div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedPosts.map((post: BlueprintPost, idx: number) => (
                                                <tr
                                                    key={post.id}
                                                    className="LemonTable__row"
                                                    onClick={() => handlePostClick(post)}
                                                    style={{ cursor: 'pointer' }}
                                                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--color-bg-fill-button-tertiary-hover, rgba(0,0,0,0.04))' }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = '' }}
                                                >
                                                    <td style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--muted-3000)', width: '48px' }}>
                                                        {currentPage * itemsPerPage + idx + 1}
                                                    </td>
                                                    <td style={{ maxWidth: 0 }}>
                                                        <div className="flex items-center gap-2">
                                                            <IconDocument className="w-3.5 h-3.5 opacity-50 shrink-0" />
                                                            <span style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {post.title}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td style={{ fontSize: '12px', opacity: 0.7, whiteSpace: 'nowrap', width: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {post.lectureName}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </ScrollableShadows>
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 border-t border-[var(--border-3000)] flex justify-between items-center text-[10px] opacity-50 lowercase font-bold font-mono shrink-0">
                        <div>
                            {currentCategory?.name || 'blueprints'} • {currentPosts.length} posts
                        </div>
                        <div className="flex items-center">
                            <IconStack className="w-3.5 h-3.5" />
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
