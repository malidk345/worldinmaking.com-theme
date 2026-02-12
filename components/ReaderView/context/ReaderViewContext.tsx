"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useApp } from 'context/App'

interface ReaderViewContextType {
    isNavVisible: boolean
    isTocVisible: boolean
    fullWidthContent: boolean
    setFullWidthContent: (value: boolean) => void
    lineHeightMultiplier: number
    backgroundImage: string | null
    toggleNav: () => void
    toggleToc: () => void
    handleLineHeightChange: (value: number[]) => void
    setBackgroundImage: (image: string | null) => void
}

const getComputedLineHeight = (selector: string) => {
    if (typeof window === 'undefined') return 1.5
    const articleContent = document.querySelector('.reader-content-container')
    const elements = articleContent?.querySelectorAll(selector)

    if (!elements?.length) return 1.5

    const computedStyle = window.getComputedStyle(elements[0])
    const lineHeight = computedStyle.lineHeight

    if (lineHeight === 'normal') return 1.5
    if (lineHeight.endsWith('px')) {
        return parseFloat(lineHeight) / parseFloat(computedStyle.fontSize)
    }
    if (lineHeight.endsWith('%')) {
        return parseFloat(lineHeight) / 100
    }
    return parseFloat(lineHeight)
}

const ReaderViewContext = createContext<ReaderViewContextType | undefined>(undefined)

export function ReaderViewProvider({ children }: { children: React.ReactNode }) {
    const { compact } = useApp()

    // In nextjs, we don't have appWindow.size.width directly in context like aa maybe
    // We'll use window.innerWidth or a default
    const [isNavVisible, setIsNavVisible] = useState(false)
    const [navUserToggled, setNavUserToggled] = useState(false)
    const [isTocVisible, setIsTocVisible] = useState(false)
    const [tocUserToggled, setTocUserToggled] = useState(false)
    const [fullWidthContent, setFullWidthContent] = useState(false)
    const [lineHeightMultiplier, setLineHeightMultiplier] = useState<number>(1)
    const [lineHeightP, setLineHeightP] = useState<number | null>(null)
    const [lineHeightLi, setLineHeightLi] = useState<number | null>(null)
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Initial visibility based on screen size
            const isDesktop = window.innerWidth >= 1024
            setIsNavVisible(isDesktop)
            setIsTocVisible(isDesktop)
            const savedBackground = localStorage.getItem('background-image')
            if (savedBackground) setBackgroundImage(savedBackground)

            const storedFullWidthContent = localStorage.getItem('fullWidthContent')
            if (storedFullWidthContent) {
                setFullWidthContent(storedFullWidthContent === 'true')
            }

            const storedLineHeightMultiplier = localStorage.getItem('lineHeightMultiplier')
            if (storedLineHeightMultiplier) {
                setLineHeightMultiplier(parseFloat(storedLineHeightMultiplier))
            }
        }
    }, [])

    const toggleNav = useCallback(() => {
        setNavUserToggled(true)
        setIsNavVisible((prev) => !prev)
    }, [])

    const toggleToc = useCallback(() => {
        setTocUserToggled(true)
        setIsTocVisible((prev) => !prev)
    }, [])

    const handleLineHeightChange = (value: number[]) => {
        setLineHeightMultiplier(value[0])
        localStorage.setItem('lineHeightMultiplier', value[0].toString())
    }

    useEffect(() => {
        if (!lineHeightP || !lineHeightLi) {
            const baseLineHeightP = getComputedLineHeight('p')
            const baseLineHeightLi = getComputedLineHeight('li')
            setLineHeightP(baseLineHeightP)
            setLineHeightLi(baseLineHeightLi)
            return
        }

        const styleId = 'reader-line-height-style'
        let style = document.getElementById(styleId) as HTMLStyleElement

        if (!style) {
            style = document.createElement('style')
            style.id = styleId
            document.head.appendChild(style)
        }

        style.textContent = `
            .reader-content-container p { line-height: ${lineHeightP * lineHeightMultiplier} !important; }
            .reader-content-container li { line-height: ${lineHeightLi * lineHeightMultiplier} !important; }
        `

        return () => {
            // style.remove() // Don't remove if we want it to persist across navigation within the same window
        }
    }, [lineHeightMultiplier, lineHeightLi, lineHeightP])

    const handleBackgroundImageChange = useCallback((image: string | null) => {
        setBackgroundImage(image)
        if (typeof window !== 'undefined') {
            if (image) {
                localStorage.setItem('background-image', image)
            } else {
                localStorage.removeItem('background-image')
            }
        }
    }, [])

    useEffect(() => {
        localStorage.setItem('fullWidthContent', fullWidthContent.toString())
    }, [fullWidthContent])

    const value = {
        isNavVisible,
        isTocVisible,
        fullWidthContent,
        setFullWidthContent,
        lineHeightMultiplier,
        backgroundImage,
        toggleNav,
        toggleToc,
        handleLineHeightChange,
        setBackgroundImage: handleBackgroundImageChange,
    }

    return <ReaderViewContext.Provider value={value}>{children}</ReaderViewContext.Provider>
}

export function useReaderView() {
    const context = useContext(ReaderViewContext)
    if (context === undefined) {
        throw new Error('useReaderView must be used within a ReaderViewProvider')
    }
    return context
}
