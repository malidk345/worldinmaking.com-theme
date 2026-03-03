"use client"

import React from 'react'

export default function HomeControl() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-primary text-primary p-6 md:p-12 text-left font-mono lowercase selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
            <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black tracking-tighter">worldinmaking (wim)</h1>
                    <p className="text-sm opacity-40 italic"><span>{'//'}</span> an exploration of constructed realities</p>
                </div>

                <div className="space-y-4 text-[15px] leading-relaxed border-l border-primary/10 pl-6 py-2">
                    <p>
                        welcome to worldinmaking (wim). this is a space dedicated to the interrogation of the systems we inherit and the structures we build.
                    </p>
                    <p>
                        everything you see here — from the code to the concepts — is a work in progress. a conscious act of formation.
                    </p>
                </div>

                <div className="flex gap-4 pt-4">
                    <div className="px-3 py-1 border border-primary text-[10px] font-bold hover:bg-primary hover:text-white transition-colors cursor-help">
                        status: active
                    </div>
                    <div className="px-3 py-1 border border-primary/20 text-[10px] font-bold opacity-50">
                        ver: 0.1.0-alpha
                    </div>
                </div>
            </div>
        </div>
    )
}
