"use client"

import React, { useEffect, useRef, useState } from 'react'
import { IconSearch, IconX } from '@posthog/icons'
import OSButton from 'components/OSButton'
import { useInPageSearch } from './InPageSearchContext'
import Mark from 'mark.js'
import debounce from 'lodash/debounce'

interface InPageSearchBarProps {
    visible: boolean
    onClose: () => void
    contentRef?: React.RefObject<HTMLElement | null>
    className?: string
    dataScheme?: string
    onSearch?: (search: string) => void
}

export const InPageSearchBar: React.FC<InPageSearchBarProps> = ({
    visible,
    onClose,
    contentRef,
    className,
    dataScheme = 'primary',
    onSearch,
}) => {
    const { searchQuery, setSearchQuery } = useInPageSearch()
    const [inputValue, setInputValue] = useState(searchQuery)
    const markedRef = useRef<Mark | null>(null)
    const duplicateContainerRef = useRef<HTMLDivElement | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Sync input value with searchQuery when it changes externally
    useEffect(() => {
        setInputValue(searchQuery)
    }, [searchQuery])

    const createDuplicateForHighlighting = () => {
        if (!contentRef?.current) return

        if (duplicateContainerRef.current) {
            duplicateContainerRef.current.remove()
        }

        const duplicate = document.createElement('div')
        const clone = contentRef.current.cloneNode(true) as HTMLElement

        duplicate.appendChild(clone)
        duplicate.className = 'highlight-container'

        contentRef.current?.parentElement?.appendChild(duplicate)
        contentRef.current.style.display = 'none'

        duplicateContainerRef.current = duplicate
        markedRef.current = new Mark(duplicate)

        if (inputValue) {
            markedRef.current.unmark()
            markedRef.current.mark(inputValue)
        }
    }

    // Setup/Teardown setup
    useEffect(() => {
        if (!contentRef?.current) return

        if (!visible) {
            setInputValue('')
            if (duplicateContainerRef.current) {
                duplicateContainerRef.current.remove()
                duplicateContainerRef.current = null
                if (contentRef.current) {
                    contentRef.current.style.display = 'block'
                }
            }
        } else {
            createDuplicateForHighlighting()
        }

        return () => {
            if (duplicateContainerRef.current) {
                duplicateContainerRef.current.remove()
                duplicateContainerRef.current = null
                if (contentRef.current) {
                    contentRef.current.style.display = 'block'
                }
            }
        }
    }, [visible])

    // Handle Escape key to close search
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onSearch?.('')
            setSearchQuery('')
            setInputValue('')
            onClose()
        }
    }

    // Handle search input
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setInputValue(value)
        onSearch?.(value)
    }

    // Update the global search state after a brief delay (debounce)
    const debouncedSetSearchQuery = React.useMemo(
        () => debounce((value: string) => {
            setSearchQuery(value)
            if (markedRef.current && duplicateContainerRef.current) {
                markedRef.current.unmark()
                if (value.trim()) {
                    markedRef.current.mark(value)
                }
            }
        }, 200),
        [setSearchQuery]
    )

    useEffect(() => {
        if (visible) {
            debouncedSetSearchQuery(inputValue)
        }
    }, [inputValue, debouncedSetSearchQuery, visible])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (visible && event.target instanceof HTMLElement && !containerRef.current?.contains(event.target)) {
                onClose()
            }
        }
        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [visible, onClose])

    if (!visible) return null

    return (
        <div
            ref={containerRef}
            data-scheme={dataScheme}
            className={`absolute w-64 p-1.5 border border-primary rounded-md z-[100] flex items-center gap-1 bg-primary shadow-[0_-10px_30px_rgba(0,0,0,0.15)] ${className || ''}`}
        >
            <div className="relative w-full">
                <IconSearch className="absolute left-2 top-1/2 -translate-y-1/2 size-4 opacity-40" />
                <input
                    placeholder="Search this page..."
                    className="w-full pl-8 pr-2 py-1 rounded border border-input text-primary text-sm bg-transparent outline-none focus:border-accent transition-colors"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    autoFocus
                />
            </div>
            <OSButton
                size="xs"
                variant="ghost"
                icon={<IconX className="size-4" />}
                onClick={() => {
                    onSearch?.('')
                    setSearchQuery('')
                    setInputValue('')
                    onClose()
                }}
                className="rounded-full !p-1 flex-shrink-0"
            />
        </div>
    )
}

export default InPageSearchBar
