"use client"

import React from 'react'

export interface TableOfContentsItem {
    url: string
    value: string
    depth: number
}

interface TableOfContentsProps {
    tableOfContents: TableOfContentsItem[]
    contentRef: React.RefObject<HTMLDivElement | null>
    title?: string
    className?: string
}

interface ElementScrollLinkProps {
    id: string
    label: string
    className: string
    element: React.RefObject<HTMLDivElement | null>
    style?: React.CSSProperties
}

const ElementScrollLink = ({ id, label, className, element, style }: ElementScrollLinkProps) => {
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault()
        const targetElement = document.getElementById(id.replace('#', ''))
        if (targetElement && element.current) {
            const scrollElement = element.current.closest('[data-radix-scroll-area-viewport]') as HTMLElement
            if (scrollElement) {
                const offsetTop = targetElement.getBoundingClientRect().top - scrollElement.getBoundingClientRect().top + scrollElement.scrollTop - 20
                scrollElement.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth',
                })
            }
        }
    }

    return (
        <a href={id} onClick={handleClick} className={className} style={style}>
            {label}
        </a>
    )
}

export const TableOfContents = ({ tableOfContents, contentRef, title = 'Content', className = '' }: TableOfContentsProps) => {
    if (!tableOfContents || tableOfContents.length === 0) {
        return null
    }

    return (
        <div className={`font-nav not-prose ${className}`}>
            {/* Header */}
            <div className="flex items-center gap-2 px-3 mb-3">
                <div className="w-1 h-3 rounded-full bg-gradient-to-b from-burnt-orange to-burnt-orange/40" />
                <h4 className="font-black text-black dark:text-white m-0 text-[9px] lowercase tracking-[0.2em]">
                    {title.toLowerCase()}
                </h4>
            </div>

            {/* TOC Items */}
            <ul className="list-none m-0 p-0 flex flex-col gap-[2px] relative">
                {/* Vertical guide line */}
                <div className="absolute left-[18px] top-1 bottom-1 w-[1px] bg-gradient-to-b from-primary-text/8 via-primary-text/5 to-transparent" />

                {tableOfContents.map((navItem) => {
                    const isTopLevel = navItem.depth === 0
                    return (
                        <li className="relative leading-tight m-0" key={navItem.url}>
                            <ElementScrollLink
                                id={navItem.url}
                                label={navItem.value.toLowerCase()}
                                className={`
                                    group/toc-item block py-1.5 px-3 rounded-md transition-all duration-200 relative
                                    ${isTopLevel
                                        ? 'text-[11px] font-medium text-black dark:text-white hover:text-black dark:hover:text-white hover:bg-burnt-orange/8'
                                        : 'text-[10px] font-normal text-black dark:text-white hover:text-black dark:hover:text-white hover:bg-accent/40'
                                    }
                                    before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2
                                    before:w-[2px] before:h-0 before:bg-burnt-orange before:rounded-full
                                    before:transition-all before:duration-200
                                    hover:before:h-3/5
                                    active:scale-[0.98]
                                `}
                                element={contentRef}
                                style={{
                                    paddingLeft: `${navItem.depth * 0.75 + 0.75}rem`,
                                }}
                            />
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

