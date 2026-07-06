import * as React from 'react'
import * as Menubar from '@radix-ui/react-menubar'
import { ChevronRight as IconChevronRight } from 'lucide-react'
import Link from 'components/Link'
import ScrollArea from './ScrollArea'
import KeyboardShortcut from 'components/KeyboardShortcut'
import { useApp } from '../../context/App'

// Types
export type MenuItemType = {
    type: 'item' | 'submenu' | 'separator'
    label?: string
    link?: string
    shortcut?: string | string[] // Support both string and array of keys
    disabled?: boolean
    icon?: React.ReactNode
    items?: MenuItemType[] // For submenus
    onClick?: () => void
    node?: React.ReactNode // Allow embedding a React node
    external?: boolean // Whether the link should open in a new window with external styling
    active?: boolean
    mobileDestination?: string | false // Mobile-specific destination URL or false to omit from mobile menu
}

export type MenuType = {
    trigger: React.ReactNode
    bold?: boolean
    items: MenuItemType[]
    mobileLink?: string // Direct link for the menu trigger on mobile
}

const RootClasses = 'flex gap-px py-0.5 h-full'
const TriggerClassesDefault =
    'group flex select-none items-center justify-between gap-0.5 rounded px-1.5 py-0.5 text-[13px] leading-none text-primary outline-none data-[highlighted]:bg-accent hover:bg-accent-2 data-[state=open]:bg-accent'
const ItemClassesDefault =
    'hover:bg-accent group relative flex h-[25px] select-none justify-between items-center rounded text-[13px] leading-none text-primary bg-primary outline-none data-[disabled]:pointer-events-none data-[disabled]:text-muted [&>span]:inline-flex [&>span]:w-full'
const SubTriggerClassesDefault =
    'hover:bg-accent group relative flex h-[25px] select-none items-center rounded px-2.5 text-[13px] leading-none text-primary bg-primary outline-none data-[disabled]:pointer-events-none data-[disabled]:text-muted'
const ContentClassesDefault =
    'bg-primary min-w-[180px] md:min-w-[220px] rounded-md p-[5px] shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)] will-change-[transform,opacity] [animation-duration:_400ms] [animation-timing-function:_cubic-bezier(0.16,_1,_0.3,_1)]'
const SeparatorClassesDefault = 'm-[5px] h-px bg-border'

const ContentClassesIos26 = 'bg-white/80 dark:bg-black/80 supports-[backdrop-filter]:backdrop-blur-[60px] min-w-[180px] md:min-w-[250px] rounded-[24px] p-2 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.3)] border border-black/10 dark:border-white/10 will-change-[transform,opacity] [animation-duration:_400ms] [animation-timing-function:_cubic-bezier(0.23,_1,_0.32,_1)]'
const ItemClassesIos26 = 'group relative flex min-h-[32px] py-1 select-none justify-between items-center rounded-[18px] px-2 text-[14px] leading-none text-primary bg-transparent outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>span]:inline-flex [&>span]:w-full transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] data-[highlighted]:bg-black/5 dark:data-[highlighted]:bg-white/10 cursor-pointer'
const SubTriggerClassesIos26 = 'group relative flex min-h-[32px] py-1 select-none items-center rounded-[18px] px-2 text-[14px] leading-none text-primary bg-transparent outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] data-[highlighted]:bg-black/5 dark:data-[highlighted]:bg-white/10 cursor-pointer'
const SeparatorClassesIos26 = 'm-[5px] h-px bg-black/10 dark:bg-white/10'

const getContentClasses = (variant?: 'default' | 'ios26') => variant === 'ios26' ? ContentClassesIos26 : ContentClassesDefault
const getItemClasses = (variant?: 'default' | 'ios26') => variant === 'ios26' ? ItemClassesIos26 : ItemClassesDefault
const getSubTriggerClasses = (variant?: 'default' | 'ios26') => variant === 'ios26' ? SubTriggerClassesIos26 : SubTriggerClassesDefault
const getSeparatorClasses = (variant?: 'default' | 'ios26') => variant === 'ios26' ? SeparatorClassesIos26 : SeparatorClassesDefault

const ShortcutClasses =
    'ml-auto pl-5 group-hover:text-secondary group-data-[disabled]:text-muted data-[highlighted]:data-[state=open]:text-secondary group-data-[highlighted]:text-secondary'

// Helper to render menu item content (icon + label + chevron)
const MenuItemContent = (item: MenuItemType, forceIconIndent?: boolean) => {
    const iconContent = item.icon ? (
        <span className="mr-2 flex items-center">{item.icon}</span>
    ) : forceIconIndent ? (
        <span style={{ display: 'inline-block', width: 16, minWidth: 16 }} className="mr-2" />
    ) : null

    return (
        <>
            {iconContent}
            {item.label}
            <div className={ShortcutClasses}>
                <IconChevronRight className="size-4" />
            </div>
        </>
    )
}

// Process menu items for mobile display - truncate nesting to 2 levels max
const processMobileMenuItem = (item: MenuItemType): MenuItemType | null => {
    // Skip items marked for mobile omission
    if (item.mobileDestination === false) {
        return null
    }

    // If item has a mobile destination, convert submenu to simple link
    if (item.mobileDestination && item.type === 'submenu') {
        return {
            ...item,
            type: 'item' as const,
            link: item.mobileDestination,
            items: undefined, // Remove nested items on mobile
        }
    }

    // For submenus without explicit mobile destination, limit depth
    if (item.type === 'submenu' && item.items) {
        // If the submenu has a link, make it a simple link on mobile
        if (item.link) {
            return {
                ...item,
                type: 'item' as const,
                items: undefined,
            }
        }

        // Otherwise, process children but make them all leaf nodes
        if (Array.isArray(item.items)) {
            const processedItems = item.items
                .map((subItem: MenuItemType) => {
                    // Convert all nested submenus to simple items
                    if (subItem.type === 'submenu') {
                        return {
                            ...subItem,
                            type: 'item' as const,
                            link:
                                subItem.link ||
                                subItem.mobileDestination ||
                                subItem.items?.find((subItem) => !!subItem?.link)?.link ||
                                '#',
                            items: undefined,
                        }
                    }
                    return subItem
                })
                .filter(Boolean) as MenuItemType[]

            return {
                ...item,
                items: processedItems,
            }
        }
    }

    return item
}

const processMobileMenuItems = (items: MenuItemType[]): MenuItemType[] => {
    const processedItems: MenuItemType[] = []

    for (let i = 0; i < items.length; i++) {
        const item = items[i]

        // Skip items marked for mobile omission
        if (item.mobileDestination === false) {
            // Also skip the preceding separator if it exists
            if (processedItems.length > 0 && processedItems[processedItems.length - 1].type === 'separator') {
                processedItems.pop()
            }
            continue
        }

        const processed = processMobileMenuItem(item)
        if (processed) {
            processedItems.push(processed)
        }
    }

    return processedItems
}

// Components
const MenuItem: React.FC<{
    item: MenuItemType
    forceIconIndent?: boolean
    menuIndex: number
    variant?: 'default' | 'ios26'
}> = ({ item, forceIconIndent, menuIndex, variant }) => {
    if (item.type === 'separator') {
        return <Menubar.Separator className={getSeparatorClasses(variant)} />
    }

    if (item.node) {
        return (
            <Menubar.Item className={getItemClasses(variant)} disabled={item.disabled} onClick={item.onClick}>
                {item.node}
            </Menubar.Item>
        )
    }

    if (item.type === 'submenu' && item.items) {
        // If items is an array, render as before
        if (Array.isArray(item.items)) {
            const anyChildHasIcon = item.items.some((subItem) => !!subItem.icon)
            return (
                <Menubar.Sub>
                    {item.link ? (
                        <Link
                            to={item.link}
                            state={{ newWindow: true }}
                            externalNoIcon={item.external}
                            className="no-underline"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                            <Menubar.SubTrigger className={getSubTriggerClasses(variant)}>
                                {MenuItemContent(item, forceIconIndent)}
                            </Menubar.SubTrigger>
                        </Link>
                    ) : (
                        <Menubar.SubTrigger className={getSubTriggerClasses(variant)}>
                            {MenuItemContent(item, forceIconIndent)}
                        </Menubar.SubTrigger>
                    )}
                    <Menubar.Portal>
                        <Menubar.SubContent className={getContentClasses(variant)} alignOffset={-5} data-scheme="primary">
                            <ScrollArea className="max-h-[100dvh] !overflow-y-auto">
                                {item.items.map((subItem, subIndex) => (
                                    <MenuItem
                                        key={`${subItem.link}-${subIndex}`}
                                        item={subItem}
                                        forceIconIndent={anyChildHasIcon}
                                        menuIndex={menuIndex} variant={variant}
                                    />
                                ))}
                            </ScrollArea>
                        </Menubar.SubContent>
                    </Menubar.Portal>
                </Menubar.Sub>
            )
        }
        // If items is a React element, render it directly
        if (React.isValidElement(item.items)) {
            return (
                <Menubar.Sub>
                    <Menubar.SubTrigger className={getSubTriggerClasses(variant)}>
                        {item.icon ? (
                            <span className="mr-2 flex items-center">{item.icon}</span>
                        ) : forceIconIndent ? (
                            <span style={{ display: 'inline-block', width: 16, minWidth: 16 }} className="mr-2" />
                        ) : null}
                        {item.label}
                        <div className={ShortcutClasses}>
                            <IconChevronRight className="size-4" />
                        </div>
                    </Menubar.SubTrigger>
                    <Menubar.Portal>
                        <Menubar.SubContent className={getContentClasses(variant)} alignOffset={-5} data-scheme="primary">
                            {item.items}
                        </Menubar.SubContent>
                    </Menubar.Portal>
                </Menubar.Sub>
            )
        }
    }

    return (
        <Menubar.Item
            className={`${getItemClasses(variant)} ${item.active ? 'bg-accent' : ''}`}
            disabled={item.disabled}
            onClick={item.onClick}
        >
            {item.link ? (
                <Link
                    to={item.link}
                    state={{ newWindow: true }}
                    externalNoIcon={item.external}
                    className="w-full min-h-[25px] h-full px-2.5 flex items-center gap-2 no-underline text-primary"
                >
                    {item.icon ? (
                        item.icon
                    ) : forceIconIndent ? (
                        <span style={{ display: 'inline-block', width: 16, minWidth: 16 }} />
                    ) : null}
                    <span>{item.label}</span>
                </Link>
            ) : (
                <span className="px-2.5 flex w-full justify-between items-center gap-2">
                    <span className="flex-1 flex items-center gap-2">
                        {item.icon ? (
                            item.icon
                        ) : forceIconIndent ? (
                            <span style={{ display: 'inline-block', width: 16, minWidth: 16 }} />
                        ) : null}
                        <span>{item.label}</span>
                    </span>
                    {item.shortcut && (
                        <div className={`${ShortcutClasses} hidden md:block`}>
                            {Array.isArray(item.shortcut) ? (
                                <div className="flex items-center">
                                    {item.shortcut.map((key, index) => (
                                        <React.Fragment key={index}>
                                            <KeyboardShortcut text={key} size="xs" />
                                            {/* 
                                            {index < item.shortcut!.length - 1 && (
                                                <span className="text-muted text-xs">+</span>
                                            )}
                                             */}
                                        </React.Fragment>
                                    ))}
                                </div>
                            ) : (
                                <KeyboardShortcut text={item.shortcut} size="xs" />
                            )}
                        </div>
                    )}
                </span>
            )}
        </Menubar.Item>
    )
}

export interface MenuBarProps {
    menus: MenuType[]
    variant?: 'default' | 'ios26'
    className?: string
    customTriggerClasses?: string
    triggerAsChild?: boolean
}

const MenuBar: React.FC<MenuBarProps> = React.memo(({ menus, className, triggerAsChild, customTriggerClasses, variant }) => {
    const { isMobile } = useApp()

    // Process menus for mobile if needed
    const processedMenus = React.useMemo(() => {
        if (!isMobile) return menus

        return menus.map((menu) => {
            // If menu has mobileLink, don't process items since they won't be shown
            if (menu.mobileLink) {
                return menu
            }

            return {
                ...menu,
                items: processMobileMenuItems(menu.items),
            }
        })
    }, [menus, isMobile])

    return (
        <Menubar.Root data-scheme="tertiary" className={`${RootClasses} ${className || ''}`}>
            {processedMenus.map((menu, menuIndex) => {
                // On mobile, if menu has mobileLink, make it a direct link
                if (isMobile && menu.mobileLink) {
                    return (
                        <Link
                            key={menuIndex}
                            to={menu.mobileLink}
                            state={{ newWindow: true }}
                            className={`${TriggerClassesDefault} ${menu.bold ? 'font-bold' : 'font-medium'} ${customTriggerClasses || ''
                                }`}
                        >
                            {menu.trigger}
                        </Link>
                    )
                }

                return (
                    <Menubar.Menu key={menuIndex} data-scheme="primary">
                        <Menubar.Trigger
                            asChild={triggerAsChild}
                            className={`${triggerAsChild ? '' : TriggerClassesDefault} ${menu.bold ? 'font-bold' : 'font-medium'
                                } ${customTriggerClasses}`}
                        >
                            {menu.trigger}
                        </Menubar.Trigger>
                        <Menubar.Portal>
                            <Menubar.Content
                                className={getContentClasses(variant)}
                                align="start"
                                sideOffset={5}
                                alignOffset={-3}
                                data-scheme="primary"
                            >
                                {menu.items.map((item, itemIndex) => (
                                    <MenuItem key={`${menuIndex}-${itemIndex}`} item={item} menuIndex={menuIndex} variant={variant} />
                                ))}
                            </Menubar.Content>
                        </Menubar.Portal>
                    </Menubar.Menu>
                )
            })}
        </Menubar.Root>
    )
})

MenuBar.displayName = 'MenuBar'

export default MenuBar
