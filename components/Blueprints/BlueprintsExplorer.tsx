"use client"

import React, { useEffect, useState } from 'react'
import { useBlueprints, BlueprintPost } from 'hooks/useBlueprints'
import ScrollArea from 'components/RadixUI/ScrollArea'
import Loading from 'components/Loading'
import { useApp } from 'context/App'
import { ChevronRight, BookOpen, Layers } from 'lucide-react'

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
        <div className="absolute inset-0 bg-primary flex flex-col font-mono lowercase">
            <ScrollArea>
                <div className="max-w-4xl mx-auto py-12 px-6">
                    <header className="mb-12 border-b border-primary/10 pb-6">
                        <h1 className="text-2xl font-black flex items-center gap-3">
                            <Layers className="size-6" /> blueprints
                        </h1>
                        <p className="opacity-50 mt-2 text-xs">structured knowledge / technical archives</p>
                    </header>

                    <div className="space-y-12">
                        {hierarchy.map((category: any) => (
                            <section key={category.id} className="blueprint-category">
                                <h2 className="text-xs font-black tracking-widest uppercase opacity-30 mb-6 border-l-2 border-primary pl-4">
                                    {category.name}
                                </h2>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {category.lectures?.map((lecture: any) => (
                                        <div key={lecture.id} className="bg-accent/50 border border-primary/10 rounded-sm p-4 hover:border-primary/30 transition-colors">
                                            <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
                                                <BookOpen className="size-4 opacity-50" /> {lecture.name}
                                            </h3>
                                            
                                            <ul className="space-y-1 ml-6">
                                                {lecture.posts?.map((post: BlueprintPost) => (
                                                    <li 
                                                        key={post.id}
                                                        onClick={() => handlePostClick(post)}
                                                        className="text-[11px] opacity-60 hover:opacity-100 hover:text-blue-500 cursor-pointer flex items-center gap-1 group"
                                                    >
                                                        <ChevronRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        {post.title}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                </div>
            </ScrollArea>
        </div>
    )
}
