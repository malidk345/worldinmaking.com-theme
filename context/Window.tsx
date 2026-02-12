"use client"

import React, { createContext, useContext } from 'react'
import type { DragControls } from 'framer-motion'
import type { MenuItemType } from 'components/RadixUI/MenuBar'
import type { IMenu } from 'components/PostLayout/types'

export interface AppWindow {
    element?: React.ComponentType | React.ReactNode
    key: string
    zIndex: number
    meta?: {
        title: string
    }
    minimized: boolean
    path: string
    fromHistory?: boolean
    props?: Record<string, unknown>
    ref?: React.RefObject<HTMLDivElement>
    sizeConstraints: {
        min: { width: number; height: number }
        max: { width: number; height: number }
    }
    size: { width: number; height: number }
    previousSize: { width: number; height: number }
    position: { x: number; y: number }
    previousPosition: { x: number; y: number }
    fixedSize: boolean
    minimal: boolean
    appSettings?: Record<string, unknown>
    location?: { pathname: string; search: string; hash: string } | string
    title?: string
    icon?: React.ReactNode
}

interface WindowContextType {
    appWindow?: AppWindow
    menu?: MenuItemType[]
    setMenu?: (menu: MenuItemType[]) => void
    goBack: () => void
    goForward: () => void
    canGoBack: boolean
    canGoForward: boolean
    dragControls?: DragControls
    setPageOptions: (pageOptions: MenuItemType[]) => void
    activeInternalMenu?: IMenu
    setActiveInternalMenu: (activeInternalMenu: IMenu) => void
    internalMenu: IMenu[]
    parent?: IMenu
    view: 'marketing' | 'developer'
    setView: (view: 'marketing' | 'developer') => void
}

export const Context = createContext<WindowContextType>({
    goBack: () => { },
    goForward: () => { },
    canGoBack: false,
    canGoForward: false,
    setPageOptions: () => { },
    setActiveInternalMenu: () => { },
    internalMenu: [],
    view: 'marketing',
    setView: () => { },
})

export const WindowProvider = ({
    appWindow,
    children,
    value,
}: {
    appWindow?: AppWindow
    children: React.ReactNode
    value?: Partial<WindowContextType>
}) => {
    // Placeholder for addWindow function if it's meant to be provided by the context
    // In a real app, this would likely come from a state management solution or a parent component
    const addWindow = (newWindow: Omit<AppWindow, 'zIndex' | 'minimized' | 'sizeConstraints' | 'size' | 'previousSize' | 'position' | 'previousPosition' | 'fixedSize' | 'minimal'>) => {
        console.log('addWindow called with:', newWindow);
        // Implement actual window adding logic here
    };

    return (
        <Context.Provider
            value={{
                appWindow,
                goBack: () => { },
                goForward: () => { },
                canGoBack: false,
                canGoForward: false,
                setPageOptions: () => { },
                setActiveInternalMenu: () => { },
                internalMenu: [],
                view: 'marketing',
                setView: () => { },
                addWindow, // Provide addWindow through context
                ...value,
            }}
        >
            {children}
        </Context.Provider>
    )
}

export const useWindow = (): WindowContextType => {
    const context = useContext(Context)
    if (!context) {
        throw new Error('useWindow must be used within a WindowProvider')
    }
    return context
}
