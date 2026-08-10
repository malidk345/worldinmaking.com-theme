import React, { createContext, useEffect, useMemo, useState } from 'react'
import { IProps } from './types'
import { useLayoutData } from 'components/Layout/hooks'
import useDataPipelinesNav from '../../navs/useDataPipelinesNav'
import useSourcesNav from '../../navs/useSourcesNav'

export const Context = createContext<IProps | undefined>(undefined)

type ProviderProps = {
    value: IProps
    children: React.ReactNode
}

export const defaultMenuWidth = { left: 265, right: 265 }

const isLabel = (item: any) => !item?.url && item?.name

export const PostProvider: React.FC<ProviderProps> = ({
    value: {
        menuWidth = defaultMenuWidth,
        contentContainerClassName = '',
        menuType = 'standard',
        mobileMenu = true,
        darkMode = true,
        hideSidebar,
        sidebar,
        askMax = false,
        ...other
    },
    children,
}) => {
    const dynamicMenus = useMemo(
        () => ({
            'data-pipeline-destinations': useDataPipelinesNav({ type: 'destination' }),
            'data-pipeline-transformations': useDataPipelinesNav({ type: 'transformation' }),
            'data-pipeline-source-webhooks': useDataPipelinesNav({ type: 'source_webhook' }),
            'data-pipeline-sources': useSourcesNav('/docs/cdp/sources'),
            'data-warehouse-sources': useSourcesNav('/docs/data-warehouse/sources'),
        }),
        []
    )

    const { activeInternalMenu, fullWidthContent } = useLayoutData()

    const menu = useMemo(() => {
        const menu = other.menu || activeInternalMenu?.children
        return menu?.map((item) => {
            if (item.dynamicChildren && dynamicMenus[item.dynamicChildren]) {
                const childrenCombined = [...item.children, ...dynamicMenus[item.dynamicChildren]]
                const newChildren: any[][] = []
                for (const child of childrenCombined) {
                    if (isLabel(child)) {
                        newChildren.push([child])
                    } else {
                        const lastGroup = newChildren[newChildren.length - 1]
                        if (!lastGroup || isLabel(lastGroup[lastGroup.length - 1])) {
                            newChildren.push([child])
                        } else {
                            lastGroup.push(child)
                        }
                    }
                }

                newChildren.forEach((group) => {
                    group.sort((a, b) => {
                        if (!a.url || !b.url) return 0
                        return a.name.localeCompare(b.name)
                    })
                })

                return { ...item, children: newChildren.flat() }
            }
            return item
        })
    }, [other.menu, activeInternalMenu])

    const tableOfContents = other.tableOfContents?.filter((item) => item.depth > -1 && item.depth < 2)
    const contentContainerClasses =
        contentContainerClassName ||
        `px-5 lg:px-6 xl:px-12 pt-6 pb-12 transition-all ${menu ? 'mx-auto' : 'lg:ml-auto'}`

    return (
        <Context.Provider
            value={{
                ...other,
                menuWidth,
                contentContainerClassName,
                menuType,
                mobileMenu,
                darkMode,
                fullWidthContent: other.fullWidthContent ?? fullWidthContent,
                hideSidebar,
                sidebar,
                menu,
                askMax,
                contentContainerClasses,
                tableOfContents,
            }}
        >
            {children}
        </Context.Provider>
    )
}
