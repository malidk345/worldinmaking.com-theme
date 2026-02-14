"use client"

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconGlobe, IconCheck } from '@posthog/icons'

interface Language {
    code: string
    name: string
    nativeName: string
}

const SUPPORTED_LANGUAGES: Language[] = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
]

interface LanguageSelectorProps {
    visible: boolean
    onClose: () => void
    currentLanguage: string
    onLanguageChange: (code: string) => void
    availableLanguages?: string[] // Optional: restrict to languages the post actually has
}

export function LanguageSelector({
    visible,
    onClose,
    currentLanguage,
    onLanguageChange,
    availableLanguages
}: LanguageSelectorProps) {
    return (
        <AnimatePresence>
            {visible && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100]"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full right-0 mb-2 w-48 bg-primary border border-primary rounded-md shadow-2xl z-[101] overflow-hidden"
                    >
                        <div className="p-2 border-b border-primary bg-accent/30 flex items-center gap-2">
                            <IconGlobe className="size-3.5 opacity-50" />
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-50">select language</span>
                        </div>
                        <div className="py-1">
                            {SUPPORTED_LANGUAGES.map((lang) => {
                                const isAvailable = !availableLanguages || availableLanguages.includes(lang.code)
                                const isSelected = currentLanguage === lang.code

                                return (
                                    <button
                                        key={lang.code}
                                        disabled={!isAvailable}
                                        onClick={() => {
                                            if (isAvailable) {
                                                onLanguageChange(lang.code)
                                                onClose()
                                            }
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors
                                            ${isSelected ? 'bg-accent/20 text-primary font-bold' : 'hover:bg-accent/10 text-muted'}
                                            ${!isAvailable ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                                        `}
                                    >
                                        <div className="flex flex-col items-start translate-y-px">
                                            <span className="font-bold">{lang.nativeName}</span>
                                            <span className="text-[9px] opacity-50 leading-none">{lang.name}</span>
                                        </div>
                                        {isSelected && <IconCheck className="size-3.5 text-green-500" />}
                                    </button>
                                )
                            })}
                        </div>
                        {!availableLanguages && (
                            <div className="p-2 bg-accent/5 border-t border-primary">
                                <p className="text-[9px] text-center opacity-40 italic m-0">showing all possible languages</p>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
