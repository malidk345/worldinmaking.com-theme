import React, { createContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { IMenu } from 'components/PostLayout/types'

declare global {
    interface Window {
        __theme: string
        __setPreferredTheme: (theme: string) => void
    }
}
const docsMenu: IMenu = {
    name: 'Docs',
    url: '/docs',
    children: [],
}

const menu: IMenu[] = [
    {
        name: 'Menu 1',
        url: '/menu1',
        children: [
            { name: 'Item 1', url: '/menu1/item1' },
            { name: 'Item 2', url: '/menu1/item2' },
        ],
    },
    {
        name: 'Menu 2',
        url: '/menu2',
        children: [
            { name: 'Item 3', url: '/menu2/item3' },
        ],
    },
]

export interface LayoutContextType {
    menu: IMenu[]
    parent?: IMenu
    internalMenu?: IMenu[]
    activeInternalMenu?: IMenu
    fullWidthContent: boolean
    setFullWidthContent: React.Dispatch<React.SetStateAction<boolean>>
    compact: boolean
    enterpriseMode: boolean
    setEnterpriseMode: React.Dispatch<React.SetStateAction<boolean>>
    theoMode: boolean
    setTheoMode: React.Dispatch<React.SetStateAction<boolean>>
    post: boolean
    hedgehogModeEnabled: boolean
    setHedgehogModeEnabled: (enabled: boolean) => void
}

export const Context = createContext<LayoutContextType | undefined>(undefined)

function recursiveSearch(array: IMenu[] | string[] | unknown[], value: string): boolean {
    for (let i = 0; i < array?.length || 0; i++) {
        const element = array[i]

        if (typeof element === 'string' && element.split('?')[0] === value) {
            return true
        }

        if (typeof element === 'object' && element !== null) {
            const found = recursiveSearch(Object.values(element), value)
            if (found) {
                return true
            }
        }
    }

    return false
}

export interface IProps {
    children: React.ReactNode
    parent?: IMenu
    activeInternalMenu?: IMenu
}

export const LayoutProvider = ({ children, ...other }: IProps) => {
    const router = useRouter()
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/'
    const search = typeof window !== 'undefined' ? window.location.search : ''
    const compact = typeof window !== 'undefined' && window !== window.parent
    const [fullWidthContent, setFullWidthContent] = useState<boolean>(
        compact || (typeof window !== 'undefined' && localStorage.getItem('full-width-content') === 'true')
    )

    const hedgehogModeLocalStorage = useMemo(() => {
        // Only default it to be on if it's April 1st but still respect if they turned it off
        const today = new Date()
        const isAprilFirst = today.getMonth() === 3 && today.getDate() === 1
        let hedgehogModeLocalStorage = typeof window !== 'undefined' && localStorage.getItem('hedgehog-mode-enabled')

        if (isAprilFirst && typeof hedgehogModeLocalStorage !== 'string') {
            hedgehogModeLocalStorage = 'true'
        }

        return hedgehogModeLocalStorage
    }, [])

    const [hedgehogModeEnabled, _setHedgehogModeEnabled] = useState<boolean>(hedgehogModeLocalStorage === 'true')
    const [enterpriseMode, setEnterpriseMode] = useState(false)
    const [theoMode, setTheoMode] = useState(false)
    const [post, setPost] = useState<boolean>(false)
    const parent =
        other.parent ??
        menu.find(({ children, url }) => {
            const currentURL = pathname
            return currentURL === url?.split('?')[0] || recursiveSearch(children || [], currentURL)
        })

    const internalMenu = parent?.children

    const activeInternalMenu =
        other.activeInternalMenu ??
        internalMenu?.find((menuItem) => {
            const currentURL = pathname
            return currentURL === menuItem.url?.split('?')[0] || recursiveSearch(menuItem.children || [], currentURL)
        })

    useEffect(() => {
        localStorage.setItem('full-width-content', fullWidthContent + '')
    }, [fullWidthContent])

    const setHedgehogModeEnabled = (enabled: boolean) => {
        _setHedgehogModeEnabled(enabled)
        localStorage.setItem('hedgehog-mode-enabled', enabled + '')
    }

    useEffect(() => {
        if (compact) {
            // nosemgrep: javascript.browser.security.wildcard-postmessage-configuration.wildcard-postmessage-configuration - intentional for docs embedding, parent origin unknown, non-sensitive navigation data
            window.parent.postMessage(
                {
                    type: 'internal-navigation',
                    url: pathname,
                },
                '*'
            )
        }
    }, [pathname, compact])

    useEffect(() => {
        if (compact) {
            // nosemgrep: javascript.browser.security.wildcard-postmessage-configuration.wildcard-postmessage-configuration - intentional for docs embedding, parent origin unknown, non-sensitive menu data
            window.parent.postMessage(
                {
                    type: 'docs-active-menu',
                    activeMenuName: activeInternalMenu?.name,
                },
                '*'
            )
        }
    }, [activeInternalMenu, compact])

    useEffect(() => {
        if (typeof window === 'undefined') return

        if (compact) {
            // nosemgrep: javascript.browser.security.wildcard-postmessage-configuration.wildcard-postmessage-configuration - intentional for docs embedding, parent origin unknown, non-sensitive ready signal
            window.parent.postMessage(
                {
                    type: 'docs-ready',
                },
                '*'
            )

            // nosemgrep: javascript.browser.security.wildcard-postmessage-configuration.wildcard-postmessage-configuration - intentional for docs embedding, parent origin unknown, non-sensitive menu data
            window.parent.postMessage(
                {
                    type: 'docs-menu',
                    menu: docsMenu.children,
                },
                '*'
            )
        }

        const onMessage = (e: MessageEvent): void => {
            if (e.data.type === 'theme-toggle') {
                window.__setPreferredTheme?.(e.data.isDarkModeOn ? 'dark' : 'light')
                return
            }
            if (e.data.type === 'navigate') {
                router.push(e.data.url)
            }
        }

        window.addEventListener('message', onMessage)

        return () => window.removeEventListener('message', onMessage)
    }, [compact, router])

    useEffect(() => {
        if (enterpriseMode) {
            document.querySelector('body')?.setAttribute('style', 'font-family: Verdana !important')
        } else {
            document.querySelector('body')?.removeAttribute('style')
        }
    }, [enterpriseMode])

    useEffect(() => {
        if (pathname !== '/') {
            setEnterpriseMode(false)
        }
        if (pathname === '/' && search.includes('synergy=true')) {
            setEnterpriseMode(true)
        }
        if (
            ['/blog/', '/founders/', '/product-engineers/', '/newsletter/'].some((prefix) =>
                pathname.startsWith(prefix)
            )
        ) {
            setPost(true)
        } else {
            setPost(false)
            setTheoMode(false)
        }
    }, [pathname, search])

    return (
        <Context.Provider
            value={{
                menu,
                parent,
                internalMenu,
                activeInternalMenu,
                fullWidthContent,
                setFullWidthContent,
                compact,
                enterpriseMode,
                setEnterpriseMode,
                theoMode,
                setTheoMode,
                post,
                hedgehogModeEnabled,
                setHedgehogModeEnabled,
            }}
        >
            {children}
        </Context.Provider>
    )
}
