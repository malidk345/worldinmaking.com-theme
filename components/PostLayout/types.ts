import { SearchResultType } from 'components/Search/SearchContext'
import React from 'react'

// Generic image data interface for Next.js compatibility
export interface ImageData {
    width: number
    height: number
    images?: { fallback: { src: string } }[]
    src?: string
}

export interface ITopic {
    name: string
    url: string
    state?: Record<string, unknown>
}

export interface IContributor {
    image: ImageData | string | undefined
    name: string
    url?: string
    state?: Record<string, unknown>
    role?: string
}

export interface IMenu {
    icon?: string | React.ReactNode
    name: string
    url?: string
    children?: IMenu[]
    className?: string
    handleLinkClick?: ({
        name,
        url,
        topLevel,
        tag,
    }: {
        name: string
        url?: string
        topLevel?: boolean
        tag?: string
    }) => void
    onClick?: ({ name, url }: { name: string; url?: string }) => void
    topLevel?: boolean
    menuType?: 'scroll' | 'standard'
    badge?: {
        title: string
        className?: string
    }
    color?: string
    dynamicChildren?: string
    hidden?: boolean
    tag?: string
    active?: boolean
}

export interface ICrumb {
    name: string
    url: string
}

export interface ISidebarAction {
    children: React.ReactNode
    title: string
    width?: number | string
    className?: string
    href?: string
    onClick?: () => void
}

export interface INextPost {
    contentContainerClasses?: string
    excerpt: string
    frontmatter?: {
        title: string
    }
    fields?: {
        slug: string
    }
}

export interface TableOfContents {
    url: string
    value: string
    depth: number
}

export interface IProps {
    tableOfContents?: TableOfContents[]
    sidebar?: React.ReactNode
    contentWidth?: number | string
    questions?: React.ReactNode
    menu?: IMenu[]
    title: string
    filePath?: string
    breadcrumb?: ICrumb[]
    hideSidebar?: boolean
    nextPost?: INextPost
    hideSurvey?: boolean
    hideSearch?: boolean
    contentContainerClassName?: string
    menuType?: 'scroll' | 'standard'
    menuWidth?: {
        left?: number
        right?: number
    }
    searchFilter?: SearchResultType
    mobileMenu?: boolean
    darkMode?: boolean
    fullWidthContent?: boolean
    setFullWidthContent?: (fullWidth: boolean) => void
    contentContainerClasses?: string
    stickySidebar?: boolean
    hideWidthToggle?: boolean
    isMenuItemActive?: ({ name, url }: { name: string; url?: string }) => boolean
    isMenuItemOpen?: ({ name, url }: { name: string; url?: string }) => boolean | undefined
    askMax?: boolean
}
