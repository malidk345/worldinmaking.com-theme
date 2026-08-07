import React from 'react'
import { FileText, ArrowRight, Sparkles, Folder } from 'lucide-react'

interface SubPageCardBlockProps {
    id: string
    title: string
    description?: string
    coverGradient?: string
    iconName?: string
    blockCount?: number
    onClickCard?: (id: string) => void
}

export function SubPageCardBlock({
    id,
    title,
    description = 'Nested sub-document containing detailed blocks and research notes.',
    coverGradient = 'from-purple-900/40 via-indigo-900/20 to-slate-900/40',
    iconName = 'document',
    blockCount = 0,
    onClickCard,
}: SubPageCardBlockProps) {
    return (
        <div
            onClick={() => onClickCard && onClickCard(id)}
            className="group/card relative w-full my-3 rounded-2xl border border-primary bg-primary hover:border-yellow/50 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer select-none"
        >
            {/* Visual Cover Banner with Gradient */}
            <div className={`h-24 w-full bg-gradient-to-r ${coverGradient} relative p-4 flex items-end justify-between border-b border-primary/50`}>
                <div className="w-10 h-10 rounded-xl bg-primary/90 border border-primary/80 flex items-center justify-center text-yellow shadow-md group-hover/card:scale-110 transition-transform">
                    <FileText className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-primary/80 text-secondary border border-primary/60 backdrop-blur-md flex items-center gap-1">
                    <Folder className="w-3 h-3 text-yellow" /> Sub-page
                </span>
            </div>

            {/* Card Body & Title */}
            <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-primary m-0 group-hover/card:text-yellow transition-colors flex items-center gap-2">
                        <span>{title || 'Untitled Sub-page'}</span>
                    </h4>
                    <ArrowRight className="w-4 h-4 text-muted group-hover/card:text-yellow group-hover/card:translate-x-1 transition-all" />
                </div>

                <p className="text-xs text-secondary m-0 line-clamp-2 leading-relaxed">
                    {description}
                </p>

                <div className="pt-2 border-t border-primary/50 flex items-center justify-between text-[10px] text-muted font-mono">
                    <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-yellow" /> Craft Card Block
                    </span>
                    <span>{blockCount} blocks inside</span>
                </div>
            </div>
        </div>
    )
}
