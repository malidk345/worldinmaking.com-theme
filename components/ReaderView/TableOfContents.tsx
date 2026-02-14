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
                scrollElement.scrollTo({
                    top: targetElement.offsetTop || 0,
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
        <div className={`not-prose ${className}`}>
            {title && (
                <h4 className="font-bold text-primary-text/30 m-0 mb-2 text-[10px] uppercase tracking-widest px-2">
                    {title.toLowerCase()}
                </h4>
            )}
            <ul className="list-none m-0 p-0 flex flex-col">
                {tableOfContents.map((navItem) => {
                    return (
                        <li className="relative leading-tight m-0" key={navItem.url}>
                            <ElementScrollLink
                                id={navItem.url}
                                label={navItem.value.toLowerCase()}
                                className="block py-1 px-2 text-[11px] font-bold text-primary-text/60 hover:text-primary-text hover:bg-accent/50 rounded transition-all truncate"
                                element={contentRef}
                                style={{
                                    paddingLeft: `${(navItem.depth) * 0.75}rem`,
                                }}
                            />
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
