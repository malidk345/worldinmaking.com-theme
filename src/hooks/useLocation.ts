import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export interface LocationState {
    pathname: string
    search: string
    hash: string
    href: string
    state: any
}

export function useLocation(): LocationState {
    let router: any = null
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        router = useRouter()
    } catch (e) {
        // ignore if outside router context
    }

    const [location, setLocation] = useState<LocationState>(() => {
        const asPath = router?.asPath || ''
        const pathname = asPath.split('?')[0].split('#')[0] || '/'
        const search = asPath.includes('?') ? '?' + asPath.split('?')[1].split('#')[0] : ''
        const hash = asPath.includes('#') ? '#' + asPath.split('#')[1] : ''
        return { pathname, search, hash, href: asPath || '/', state: null }
    })

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setLocation({
                pathname: window.location.pathname,
                search: window.location.search,
                hash: window.location.hash,
                href: window.location.href,
                state: null,
            })
        }
    }, [router?.asPath])

    return location
}

export default useLocation
