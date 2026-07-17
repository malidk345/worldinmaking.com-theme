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
                    <header className="mb-12 border-b border-black/[0.08] dark:border-white/[0.08] pb-6 transition-all duration-[400ms] ease-[cubic-bezier(0.25,1,0.5,1)]">
                        <h1 className="text-2xl font-black flex items-center gap-3 text-black dark:text-white">
                            <IconStack className="size-6 text-black/80 dark:text-white/80" /> blueprints
                        </h1>
                        <p className="text-black/50 dark:text-white/50 mt-2 text-xs font-medium">structured knowledge / technical archives</p>
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
                                <h2 className="text-xs font-black tracking-widest uppercase text-black/50 dark:text-white/50 mb-6 inline-flex items-center bg-[rgba(255,255,255,0.4)] dark:bg-[rgba(10,10,12,0.7)] px-4 py-1.5 rounded-[18px] border border-black/[0.08] dark:border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] supports-[backdrop-filter]:backdrop-blur-[20px] supports-[backdrop-filter]:saturate-[180%] [transform:translate3d(0,0,0)] [-webkit-transform:translate3d(0,0,0)] transition-all duration-[400ms] ease-[cubic-bezier(0.25,1,0.5,1)]">
                                    {category.name}
                                </h2>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {category.lectures?.map((lecture: any) => (
                                        <div
                                            key={lecture.id}
                                            className="relative overflow-hidden bg-[rgba(255,255,255,0.4)] dark:bg-[rgba(10,10,12,0.7)] border border-black/[0.08] dark:border-white/[0.08] rounded-[32px] p-6 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.03),0_8px_16px_-4px_rgba(0,0,0,0.02),0_3px_6px_-2px_rgba(0,0,0,0.01),inset_0_1px_0_0_rgba(255,255,255,0.15)] dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2),0_8px_16px_-4px_rgba(0,0,0,0.1),0_3px_6px_-2px_rgba(0,0,0,0.05),inset_0_1px_0_0_rgba(255,255,255,0.05)] supports-[backdrop-filter]:backdrop-blur-[25px] supports-[backdrop-filter]:saturate-[190%] [transform:translate3d(0,0,0)] [-webkit-transform:translate3d(0,0,0)] transition-all duration-[400ms] ease-[cubic-bezier(0.25,1,0.5,1)] hover:bg-[rgba(255,255,255,0.6)] dark:hover:bg-[rgba(28,28,30,0.7)]"
                                        >
                                            <h3 className="text-sm font-bold flex items-center gap-2 mb-3 px-2 text-black dark:text-white transition-all duration-[400ms] ease-[cubic-bezier(0.25,1,0.5,1)]">
                                                <IconBook className="size-4 text-black/50 dark:text-white/50" /> {lecture.name}
                                            </h3>
                                            
                                            <ul className="space-y-1 ml-4">
                                                {lecture.posts?.map((post: BlueprintPost) => (
                                                    <li 
                                                        key={post.id}
                                                        onClick={() => handlePostClick(post)}
                                                        className="text-[12px] text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white cursor-pointer flex items-center gap-2 group py-2 px-3 hover:bg-black/[0.08] dark:hover:bg-white/[0.08] rounded-[16px] transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] active:brightness-95"
                                                    >
                                                        <IconChevronRight className="size-3 opacity-0 group-hover:opacity-100 transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] text-black/40 dark:text-white/40" />
                                                        <span className="transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]">{post.title}</span>
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
