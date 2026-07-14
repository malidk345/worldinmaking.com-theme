"use client"

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useBlueprints, BlueprintPost } from 'hooks/useBlueprints'
import ScrollArea from 'components/RadixUI/ScrollArea'
import Loading from 'components/Loading'
import { useApp } from 'context/App'
import { IconBook, IconChevronRight, IconStack } from '@posthog/icons';

export default function BlueprintsExplorer() {
    const { fetchHierarchy } = useBlueprints()
    const { addWindow } = useApp()
    const [hierarchy, setHierarchy] = useState<unknown[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true
        fetchHierarchy().then(data => {
            if (mounted) {
                setHierarchy(data || [])
                setLoading(false)
            }
        })
        return () => { mounted = false }
    }, [fetchHierarchy])

    const handlePostClick = (post: BlueprintPost) => {
        addWindow({
            key: `blueprint-post-${post.id}`,
            path: `/blueprints/post/${post.slug}`,
            title: `blueprint: ${post.title.toLowerCase()}`,
        })
    }

    if (loading) return <Loading fullScreen label="scanning blueprints" />

    return (
        <div className="absolute inset-0 bg-transparent flex flex-col font-mono lowercase">
            <ScrollArea>
                <div className="max-w-4xl mx-auto py-12 px-6">
                    <header className="mb-12 border-b border-primary/10 pb-6">
                        <h1 className="text-2xl font-black flex items-center gap-3">
                            <IconStack className="size-6" /> blueprints
                        </h1>
                        <p className="opacity-50 mt-2 text-xs">structured knowledge / technical archives</p>
                    </header>

                    <div className="space-y-12">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {hierarchy.map((category: any) => (
                            <motion.section
                                key={category.id}
                                className="blueprint-category"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, type: 'spring', bounce: 0.2 }}
                            >
                                <h2 className="text-xs font-black tracking-widest uppercase opacity-40 mb-6 inline-block bg-black/5 dark:bg-white/10 px-4 py-1.5 rounded-full">
                                    {category.name}
                                </h2>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {category.lectures?.map((lecture: any) => (
                                        <div key={lecture.id} className="bg-white/40 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-[24px] shadow-sm supports-[backdrop-filter]:backdrop-blur-xl p-6 hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300">
                                            <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
                                                <IconBook className="size-4 opacity-50" /> {lecture.name}
                                            </h3>
                                            
                                            <ul className="space-y-1 ml-6">
                                                {lecture.posts?.map((post: BlueprintPost) => (
                                                    <li 
                                                        key={post.id}
                                                        onClick={() => handlePostClick(post)}
                                                        className="text-[12px] opacity-70 hover:opacity-100 cursor-pointer flex items-center gap-2 group py-1.5 px-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors"
                                                    >
                                                        <IconChevronRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        {post.title}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </motion.section>
                        ))}
                    </div>
                </div>
            </ScrollArea>
        </div>
    )
}
