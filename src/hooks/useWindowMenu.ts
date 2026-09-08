import { useState, useEffect, useCallback } from 'react'
import type { MenuItem } from '../context/App'
import type { IMenu } from 'components/PostLayout/types'
import type { AppWindow } from '../context/Window'

export const recursiveSearch = (array: MenuItem[] | undefined, value: string): boolean => {
    if (!array) return false
    for (let i = 0; i < array.length; i++) {
        const element = array[i]
        if (element.url?.split('?')[0] === value) return true
        if (element.children && recursiveSearch(element.children, value)) return true
    }
    return false
}

export function useWindowMenu(item: AppWindow, appMenu: any, setMenu?: (menu: IMenu[]) => void) {
    const safeAppMenu = Array.isArray(appMenu) ? appMenu : []
    const parent =
        safeAppMenu.find(({ children, url }: any) => {
            const currentURL = item?.path
            return currentURL === url?.split('?')[0] || recursiveSearch(children, currentURL)
        }) ||
        safeAppMenu.find(({ url }: any) => url === `/${item?.path?.split('/')[1]}`) ||
        safeAppMenu.find(({ name }: any) => name === 'Docs')

    const internalMenu = parent?.children || []

    const getActiveInternalMenu = useCallback(() => {
        return internalMenu?.find((menuItem: MenuItem) => {
            const currentURL = item?.path
            return currentURL === menuItem.url?.split('?')[0] || recursiveSearch(menuItem.children, currentURL)
        })
    }, [internalMenu, item?.path])

    const [activeInternalMenu, setActiveInternalMenu] = useState<MenuItem | undefined>(getActiveInternalMenu())

    useEffect(() => {
        setMenu?.(internalMenu)
    }, [activeInternalMenu, setMenu])

    useEffect(() => {
        setActiveInternalMenu(getActiveInternalMenu())
    }, [item?.path, getActiveInternalMenu])

    return { activeInternalMenu, setActiveInternalMenu, menu: internalMenu, parent }
}
