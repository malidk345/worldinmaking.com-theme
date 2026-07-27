import React from 'react'
import NextLink from 'next/link'
import { useRouter as useNextRouter } from 'next/router'

export const Link = React.forwardRef<HTMLAnchorElement, any>((props, ref) => {
    const { to, href, children, state, activeClassName, onClick, ...other } = props
    const targetUrl = to || href || '#'

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (onClick) onClick(e)
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
        if (options?.replace) {
            window.location.replace(to)
        } else {
            window.location.href = to
        }
    }
}

const createMockQueryData = (): any => {
    const handler: ProxyHandler<any> = {
        get: (_target, prop) => {
            if (typeof prop === 'string') {
                if (['nodes', 'edges', 'group', 'departments', 'teamMembers', 'jobs', 'achievements', 'teams', 'staticRoadmaps', 'pipelines', 'testimonials', 'staffProfiles', 'allSqueakTeam', 'sdks', 'frameworks', 'allTeams'].includes(prop)) {
                    return []
                }
                if (['totalCount', 'count'].includes(prop)) {
                    return 0
                }
                if (['id', 'strapiID', 'main', 'state', 'aiResearchTeam', 'search'].includes(prop)) {
                    return undefined
                }
                if (['then', 'toJSON', '$typeof', 'Symbol(Symbol.toPrimitive)', 'startsWith'].includes(prop)) {
                    return undefined
                }
                if (prop === 'allPostCategory') {
                    return { nodes: [] }
                }
            }
            if (typeof prop === 'symbol') return undefined

            return new Proxy({}, handler)
        },
    }
    return new Proxy({}, handler)
}

export const useStaticQuery = (_query?: any) => {
    return createMockQueryData()
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

export const StaticQuery = ({ render }: any) => (render ? render(createMockQueryData()) : null)

export const MDXRenderer = ({ children }: any) => <>{children}</>

export const Slice = () => null

export const isMarkdownContentPath = () => false
export const Subfeature = () => null
export const createSlideConfig = (c: any) => c
export const flattenMenu = (m: any) => m || []

export const useLocation = () => {
    let pathname = '/'
    let search = ''
    let hash = ''
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const router = useNextRouter()
        if (router?.asPath) {
            pathname = router.asPath.split('?')[0].split('#')[0]
        }
    } catch (e) {}

    if (typeof window !== 'undefined') {
        pathname = window.location.pathname
        search = window.location.search
        hash = window.location.hash
    }
    return { pathname, search, hash }
}

export const SlidesTemplate = (props: any) => <div {...props}>{props.children}</div>
