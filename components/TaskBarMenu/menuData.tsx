import { MenuType, MenuItemType } from 'components/RadixUI/MenuBar'
import { useSmallTeamsMenuItems } from './SmallTeamsMenuItems'
import { useApp } from '../../context/App'

export function useMenuData(): MenuType[] {
    const smallTeamsMenuItems = useSmallTeamsMenuItems()
    const { animateClosingAllWindows, windows, setScreensaverPreviewActive, isMobile } = useApp()

    // Define main navigation items (excluding logo menu)
    const mainNavItems: MenuType[] = [
        {
            trigger: 'Menu 1',
            items: [
                {
                    type: 'item',
                    label: 'Item 1',
                    link: '/item1',
                },
                {
                    type: 'item',
                    label: 'Item 2',
                    link: '/item2',
                },
            ],
        },
        {
            trigger: 'Menu 2',
            items: [
                {
                    type: 'item',
                    label: 'Item 3',
                    link: '/item3',
                },
            ],
        },
    ]

    // Define base logo menu items (system items)
    const baseLogoMenuItems = [
        {
            type: 'item' as const,
            label: 'About',
            link: '/about',
        },
    ]

    // Process main nav items for mobile menu
    const processMobileNavItems = (): MenuItemType[] => {
        const mobileItems: MenuItemType[] = []

        mainNavItems.forEach((menu) => {
            // If menu has mobileLink, convert to simple item
            if (menu.mobileLink) {
                mobileItems.push({
                    type: 'item' as const,
                    label: typeof menu.trigger === 'string' ? menu.trigger : 'Menu',
                    link: menu.mobileLink,
                })
            } else {
                // Process items and filter out those with mobileDestination === false
                const filteredItems: MenuItemType[] = []
                const menuItemsCopy = [...menu.items]

                for (let i = 0; i < menuItemsCopy.length; i++) {
                    const item = menuItemsCopy[i]
                    // Skip items marked for mobile omission
                    if (item.mobileDestination === false) {
                        continue
                    }
                    // Convert submenus with mobileDestination to simple items
                    if (item.type === 'submenu' && item.mobileDestination) {
                        filteredItems.push({
                            ...item,
                            type: 'item' as const,
                            link: item.mobileDestination,
                            items: undefined,
                        })
                    }
                    // Convert submenus with links to simple items
                    else if (item.type === 'submenu' && item.link) {
                        filteredItems.push({
                            ...item,
                            type: 'item' as const,
                            items: undefined,
                        })
                    } else {
                        filteredItems.push(item)
                    }
                }

                if (filteredItems.length > 0) {
                    mobileItems.push({
                        type: 'submenu' as const,
                        label: typeof menu.trigger === 'string' ? menu.trigger : 'Menu',
                        items: filteredItems,
                    })
                }
            }
        })
        return mobileItems
    }

    // Combine everything
    const menu = [
        {
            trigger: 'Logo',
            items: [
                ...baseLogoMenuItems,
                { type: 'separator' },
                ...processMobileNavItems(),
            ]
        },
        ...mainNavItems
    ] as MenuType[]

    return menu
}
