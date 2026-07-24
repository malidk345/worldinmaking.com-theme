import React from 'react'
import NextLink from 'next/link'

export const Link = React.forwardRef<HTMLAnchorElement, any>((props, ref) => {
    const { to, href, children, state, activeClassName, onClick, ...other } = props
    const targetUrl = to || href || '#'

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (onClick) onClick(e)
        if (e.defaultPrevented) return

        if (e.metaKey || e.ctrlKey) return

        if (state && typeof window !== 'undefined') {
            window.history.pushState(state, '', targetUrl)
        }
    }

    return (
        <NextLink href={targetUrl} ref={ref} onClick={handleClick} {...other}>
            {children}
        </NextLink>
    )
})
Link.displayName = 'GatsbyNextLink'

export const navigate = (to: string, options?: any) => {
    if (typeof window !== 'undefined') {
        const state = options?.state
        if (state) {
            window.history.pushState(state, '', to)
        }
        if (options?.replace) {
            window.location.replace(to)
        } else {
            window.location.href = to
        }
    }
}

export const useStaticQuery = (_query?: any) => {
    return {}
}

export const graphql = (_strings: TemplateStringsArray, ..._values: any[]) => {
    return ''
}

export const useBreakpoint = () => {
    return {}
}

export const withPrefix = (path: string) => path

export const Script = (props: any) => {
    return <script {...props} />
}

export const StaticQuery = ({ render }: any) => render ? render({}) : null

export const MDXRenderer = ({ children }: any) => <>{children}</>

export const Slice = () => null

