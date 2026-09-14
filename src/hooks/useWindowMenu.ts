import { useState, useCallback, useEffect, useMemo } from 'react'
import type { MenuItem } from '../context/App'
import type { AppWindow } from '../context/Window'
import type { IMenu } from '../components/PostLayout/types'

export const recursiveSearch = (array: MenuItem[] | undefined, value: string): boolean => {
    if (!array) return false

    for (let i = 0; i < array.length; i++) {
        const element = array[i]

        if (element.url?.split('?')[0] === value) {
            return true
        }

        if (element.children) {
            const found = recursiveSearch(element.children, value)
            if (found) {
                return true
            }
        }
    }

    return false
}

export function useWindowMenu({
    item,
    appMenu,
}: {
    item: AppWindow
    appMenu: MenuItem[] | unknown
}) {
    const safeAppMenu = Array.isArray(appMenu) ? appMenu : []
    const parent = useMemo(() => {
        return (
            safeAppMenu.find(({ children, url }: any) => {
                const currentURL = item?.path
                return currentURL === url?.split('?')[0] || recursiveSearch(children, currentURL)
            }) ||
            safeAppMenu.find(({ url }: any) => url === `/${item?.path?.split('/')[1]}`) ||
            safeAppMenu.find(({ name }: any) => name === 'Docs')
        )
    }, [safeAppMenu, item?.path])

    const internalMenu = useMemo(() => parent?.children || [], [parent])

    const getActiveInternalMenu = useCallback(() => {
        return internalMenu?.find((menuItem: MenuItem) => {
            const currentURL = item?.path
            return currentURL === menuItem.url?.split('?')[0] || recursiveSearch(menuItem.children, currentURL)
        })
    }, [internalMenu, item?.path])

    const [activeInternalMenu, setActiveInternalMenu] = useState<MenuItem | undefined>(getActiveInternalMenu())

    useEffect(() => {
        setActiveInternalMenu(getActiveInternalMenu())
    }, [item?.path, getActiveInternalMenu])

    const [menu, setMenu] = useState<IMenu[]>([])

    useEffect(() => {
        setMenu(internalMenu as unknown as IMenu[])
    }, [activeInternalMenu, internalMenu])

    return {
        menu,
        setMenu,
        parent,
        internalMenu,
        activeInternalMenu,
        setActiveInternalMenu,
    }
}
