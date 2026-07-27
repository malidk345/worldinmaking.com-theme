import { useEffect, useState } from 'react'
import { useRouter as useNextRouter } from 'next/router'

const getRouterLocation = (asPath?: string) => {
    let pathname = '/'
    let search = ''
    let hash = ''
    if (asPath) {
        const [pathAndSearch, hashPart] = asPath.split('#')
        const [path, searchPart] = pathAndSearch.split('?')
        pathname = path || '/'
        search = searchPart ? `?${searchPart}` : ''
        hash = hashPart ? `#${hashPart}` : ''
    }
    return { pathname, search, hash }
}

export const useLocation = () => {
    let asPath: string | undefined
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const router = useNextRouter()
        asPath = router?.asPath
    } catch (e) {}

    // Always derive the initial value from the router so server and client
    // renders match on first paint. Only switch to window.location after
    // mount, to avoid React hydration mismatches.
    const [location, setLocation] = useState(() => getRouterLocation(asPath))

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setLocation({
                pathname: window.location.pathname,
                search: window.location.search,
                hash: window.location.hash,
            })
        }
    }, [asPath])

    return {
        ...location,
        state: null,
        key: 'default',
    }
}

export const useNavigate = () => {
    return (to: string, options?: any) => {
        if (typeof window !== 'undefined') {
            if (options?.replace) {
                window.location.replace(to)
            } else {
                window.location.href = to
            }
        }
    }
}
