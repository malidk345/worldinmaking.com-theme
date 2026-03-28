"use client"

import React, { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import { supabase } from 'lib/supabase'

interface ViewCounterProps {
    idOrSlug: string | number
    type: 'blog' | 'community'
    views: number
    className?: string
}

export default function ViewCounter({ idOrSlug, type, views, className = '' }: ViewCounterProps) {
    const [localViews, setLocalViews] = useState<number>(views)

    // Sync with parent prop
    useEffect(() => {
        setLocalViews(views)
    }, [views])

    useEffect(() => {
        if (!idOrSlug) return

        // Prevent duplicate counts per browser session
        const key = `viewed_${type}_${idOrSlug}`
        if (typeof window !== 'undefined' && localStorage.getItem(key)) return

        const incrementView = async () => {
            // Optimistic update
            setLocalViews((prev: number) => prev + 1)

            const rpcName = type === 'blog' ? 'increment_post_view' : 'increment_com_post_view'
            const rpcArgs = type === 'blog'
                ? { slug_input: String(idOrSlug) }
                : { id_input: Number(idOrSlug) }

            const { error } = await supabase.rpc(rpcName, rpcArgs)

            if (error) {
                console.error(`[ViewCounter] ${type} RPC Error:`, error.message, error)
                setLocalViews((prev: number) => prev - 1) // Rollback
                return
            }

            // Only mark as viewed if RPC succeeded
            if (typeof window !== 'undefined') {
                localStorage.setItem(key, '1')
            }
        }

        incrementView()
    }, [idOrSlug, type])

    return (
        <div
            className={`cursor-default flex items-center space-x-1.5 px-2.5 py-1 rounded-[6px] text-[13px] font-bold text-primary/50 hover:text-primary/70 transition-colors bg-primary/[0.03] hover:bg-primary/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] border border-primary/10 ${className}`}
            title={`${localViews} views`}
        >
            <Eye className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span className="translate-y-[0.5px] tracking-tight">{localViews}</span>
        </div>
    )
}
