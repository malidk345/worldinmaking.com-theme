"use client"

import React, { useEffect } from 'react'
import { Eye } from 'lucide-react'
import { supabase } from 'lib/supabase'

interface ViewCounterProps {
    idOrSlug: string | number
    type: 'blog' | 'community'
    views: number
    className?: string
}

export default function ViewCounter({ idOrSlug, type, views, className = '' }: ViewCounterProps) {
    useEffect(() => {
        if (!idOrSlug) return
        
        // Mark as viewed in localStorage to prevent spamming
        const key = `viewed_${type}_${idOrSlug}`
        if (typeof window !== 'undefined' && localStorage.getItem(key)) {
            return
        }

        const triggerView = async () => {
             if (type === 'blog') {
                 await supabase.rpc('increment_post_view', { slug_input: idOrSlug.toString() })
             } else {
                 await supabase.rpc('increment_com_post_view', { id_input: Number(idOrSlug) })
             }
             if (typeof window !== 'undefined') {
                 localStorage.setItem(key, '1')
             }
        }

        triggerView()
    }, [idOrSlug, type])

    return (
        <div 
            className={`cursor-default flex items-center space-x-1.5 px-2.5 py-1 rounded-[6px] text-[13px] font-bold text-primary/50 hover:text-primary/70 transition-colors transition-all bg-primary/[0.03] hover:bg-primary/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] border border-primary/10 ${className}`}
            title={`${views} views`}
        >
            <Eye className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span className="translate-y-[0.5px] tracking-tight">{views}</span>
        </div>
    )
}
