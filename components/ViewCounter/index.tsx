"use client"

import React, { useEffect, useState } from 'react'
import { IconEye } from '@posthog/icons';
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
            className={`cursor-default flex items-center space-x-1 text-xs font-bold text-primary/40 hover:text-primary/60 transition-colors ${className}`}
            title={`${localViews} views`}
        >
            <IconEye className="w-3.5 h-3.5 opacity-75" strokeWidth={2.5} />
            <span className="font-mono tracking-tight">{localViews}</span>
        </div>
    )
}
