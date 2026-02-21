"use client"

import React, { useEffect, useState } from 'react'
import * as Collapsible from '@radix-ui/react-collapsible'
import { IconChevronRight } from '@posthog/icons'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'components/Link'

interface MenuItem {
    name: string
    url?: string
    children?: MenuItem[]
    icon?: React.ReactNode
}

interface TreeMenuProps {
    items: MenuItem[]
    activeItem?: MenuItem
    watchPath?: boolean
}

// Helper to check if a menu branch should be open
const isOpen = (children: MenuItem[], activeItem: MenuItem | undefined): boolean => {
    if (!activeItem) return false
    return (
        children &&
        children.some((child: MenuItem) => {
            return child === activeItem || (child.children && isOpen(child.children, activeItem))
        })
    )
}

export function TreeMenu({ items = [], activeItem: propsActiveItem }: TreeMenuProps) {
    const [activeItem, setActiveItem] = useState<MenuItem | undefined>(propsActiveItem)

    const handleClick = (item: MenuItem) => {
        setActiveItem(item)
    }

    return (
        <ul className="list-none m-0 p-0 flex flex-col gap-[1px]">
            {items.length > 0 ? (
                items.map((item, index) => {
                    const key = `${item.name}-${index}-${item.url}`
                    return (
                        <TreeMenuItem
                            key={key}
                            item={item}
                            activeItem={activeItem}
                            onClick={handleClick}
                            depth={0}
                        />
                    )
                })
            ) : (
                <p className="text-[10px] font-bold opacity-20 px-4 lowercase">no items available</p>
            )}
        </ul>
    )
}

function TreeMenuItem({
    item,
    activeItem,
    onClick,
    depth = 0,
}: {
    item: MenuItem
    activeItem: MenuItem | undefined
    onClick: (item: MenuItem) => void
    depth: number
}) {
    const [open, setOpen] = useState(false)
    const hasChildren = item.children && item.children.length > 0
    const active = activeItem === item

    useEffect(() => {
        if (item.children && !open && activeItem) {
            setOpen(isOpen(item.children, activeItem))
        }
    }, [activeItem])

    const handleOpenChange = (open: boolean) => {
        setOpen(open)
    }

    // Padding calculation based on depth
    const paddingLeftStyle = { paddingLeft: `${depth * 0.75 + 0.5}rem`, paddingRight: '0.5rem' }

    // Premium styling for the item container with accent indicator
    const itemClass = `
        group flex w-full justify-between items-center relative py-1.5 px-2.5
        text-[11px] font-medium rounded-md transition-all duration-200 cursor-pointer
        before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2
        before:w-[2px] before:rounded-full before:transition-all before:duration-200
        ${active
            ? 'text-primary bg-burnt-orange/10 before:h-3/5 before:bg-burnt-orange'
            : 'text-primary/80 hover:text-primary hover:bg-accent/50 before:h-0 before:bg-burnt-orange hover:before:h-3/5'
        }
        active:scale-[0.98]
    `

    if (hasChildren) {
        return (
            <Collapsible.Root open={open} onOpenChange={handleOpenChange} asChild>
                <li className="list-none">
                    <div className="flex flex-col">
                        <Collapsible.Trigger asChild>
                            <button
                                className={itemClass}
                                style={paddingLeftStyle}
                                onClick={() => {
                                    if (item.url) onClick(item)
                                }}
                            >
                                <span className="flex items-center gap-1.5 min-w-0">
                                    {hasChildren && (
                                        <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.15 }} className="flex-shrink-0">
                                            <IconChevronRight className="size-3 opacity-40" />
                                        </motion.div>
                                    )}
                                    <span className={`break-words ${open ? 'font-semibold text-primary/70' : ''}`}>{item.name.toLowerCase()}</span>
                                </span>
                            </button>
                        </Collapsible.Trigger>

                        <Collapsible.Content>
                            <AnimatePresence>
                                {open && (
                                    <motion.ul
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="list-none m-0 p-0 overflow-hidden flex flex-col gap-[1px] mt-[2px] relative"
                                    >
                                        {/* Vertical depth guide line */}
                                        <div
                                            className="absolute top-0 bottom-0 w-[1px] bg-primary/6"
                                            style={{ left: `${(depth + 1) * 0.75 + 0.75}rem` }}
                                        />
                                        {item.children?.map((child, childIndex) => (
                                            <TreeMenuItem
                                                key={`${child.name}-${childIndex}`}
                                                item={child}
                                                activeItem={activeItem}
                                                onClick={onClick}
                                                depth={depth + 1}
                                            />
                                        ))}
                                    </motion.ul>
                                )}
                            </AnimatePresence>
                        </Collapsible.Content>
                    </div>
                </li>
            </Collapsible.Root>
        )
    }

    // Leaf node
    return (
        <li className="list-none">
            {item.url ? (
                <Link
                    to={item.url}
                    className={itemClass}
                    style={paddingLeftStyle}
                    onClick={() => onClick(item)}
                >
                    <span className="flex items-center gap-2">
                        <span>{item.name.toLowerCase()}</span>
                    </span>
                </Link>
            ) : (
                <div className={`${itemClass} cursor-default`} style={paddingLeftStyle}>
                    <span className="break-words">{item.name.toLowerCase()}</span>
                </div>
            )}
        </li>
    )
}

