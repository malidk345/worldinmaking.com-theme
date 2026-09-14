import { AppProps } from 'next/app'
import '../styles/global.css'
import '../styles/notebook-taskbar-glass.css'
import '../styles/taskbar-keyboard-lock.css'
import '../styles/notebook-mobile-block-chrome.css'
import '../styles/notebook-mobile-format-dock.css'
import '../components/HiddenSection/style.css'
import '../components/Layout/Fonts.css'
import '../components/Layout/SkeletonLoading.css'
import '../components/MdxAnchorHeaders/style.css'
import '../components/RadixUI/css/toast.css'
import { Provider } from 'context/App'
import { Provider as ToastProvider } from 'context/Toast'
import { UserProvider } from 'hooks/useUser'
import { ArchiveProvider } from 'context/ArchiveContext'
import Wrapper from 'components/Wrapper'
import { useRouter } from 'next/router'
import React from 'react'
import { KeyboardInsetRoot } from '../hooks/useKeyboardInset'
import SeoFromRoute from '../components/SeoFromRoute'
import SeoDocument from '../components/SeoDocument'
import { AppErrorBoundary } from '../components/AppErrorBoundary'
import { installCancelledRouteSwallow, isCancelledRouteError } from '../lib/swallow-cancelled-route'
import { initPostHog, trackPageView } from '../lib/wim-posthog'

if (typeof window !== 'undefined') {
    installCancelledRouteSwallow()
}


function OfflineBanner() {
    const [isOffline, setIsOffline] = React.useState(false)

    React.useEffect(() => {
        if (typeof navigator !== 'undefined') {
            setIsOffline(!navigator.onLine)
        }
        const onOnline = () => setIsOffline(false)
        const onOffline = () => setIsOffline(true)
        window.addEventListener('online', onOnline)
        window.addEventListener('offline', onOffline)
        return () => {
            window.removeEventListener('online', onOnline)
            window.removeEventListener('offline', onOffline)
        }
    }, [])

    if (!isOffline) return null

    return (
        <div className="pointer-events-none fixed left-0 right-0 top-0 z-[9999] flex justify-center">
            <div className="pointer-events-auto w-full border-b border-primary bg-accent py-1 text-center text-xs text-primary shadow-sm">
                Çevrimdışısın — bazı özellikler çalışmayabilir.
            </div>
        </div>
    )
}

export default function App({ Component, pageProps }: AppProps) {
    const router = useRouter()

    React.useEffect(() => {
        const onRejection = (event: PromiseRejectionEvent) => {
            if (isCancelledRouteError(event.reason)) {
                event.preventDefault()
            }
        }
        const onError = (event: ErrorEvent) => {
            if (isCancelledRouteError(event.error) || isCancelledRouteError(event.message)) {
                event.preventDefault()
            }
        }
        const onRouteError = (err: { cancelled?: boolean; message?: string }) => {
            if (err?.cancelled || isCancelledRouteError(err)) {
                return
            }
        }
        window.addEventListener('unhandledrejection', onRejection, true)
        window.addEventListener('error', onError, true)
        router.events.on('routeChangeError', onRouteError)
        return () => {
            window.removeEventListener('unhandledrejection', onRejection, true)
            window.removeEventListener('error', onError, true)
            router.events.off('routeChangeError', onRouteError)
        }
    }, [router.events])

    React.useEffect(() => {
        initPostHog()
        trackPageView()
        const handleRouteChange = (url: string) => {
            trackPageView(url)
        }
        router.events.on('routeChangeComplete', handleRouteChange)
        return () => {
            router.events.off('routeChangeComplete', handleRouteChange)
        }
    }, [router.events])
    const [location, setLocation] = React.useState(() => {
        if (typeof window !== 'undefined') {
            return {
                pathname: window.location.pathname,
                search: window.location.search,
                hash: window.location.hash,
                state: null,
                key: 'default',
            }
        }
        const asPath = router?.asPath || ''
        const pathname = asPath.split('?')[0].split('#')[0] || '/'
        const search = asPath.includes('?') ? '?' + asPath.split('?')[1].split('#')[0] : ''
        const hash = asPath.includes('#') ? '#' + asPath.split('#')[1] : ''
        return { pathname, search, hash, state: null, key: 'default' }
    })

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            setLocation({
                pathname: window.location.pathname,
                search: window.location.search,
                hash: window.location.hash,
                state: null,
                key: 'default',
            })
        }
    }, [router?.asPath])

    const isNotFound = !!(Component as { isWimNotFound?: boolean }).isWimNotFound

    if ((Component as any).noLayout) {
        return (
            <AppErrorBoundary>
                <ToastProvider>
                    <OfflineBanner />
                    <KeyboardInsetRoot />
                    <UserProvider>
                        <ArchiveProvider>
                            <SeoFromRoute pageProps={pageProps} isNotFound={isNotFound} />
                            <Component {...pageProps} />
                        </ArchiveProvider>
                    </UserProvider>
                </ToastProvider>
            </AppErrorBoundary>
        )
    }

    return (
        <AppErrorBoundary>
            <div
                data-scheme="primary"
                suppressHydrationWarning
                className="h-dvh min-h-0 w-screen overflow-hidden bg-light dark:bg-dark text-primary"
            >
                <OfflineBanner />
                <KeyboardInsetRoot />
                <ToastProvider>
                    <UserProvider>
                        <ArchiveProvider>
                            <Provider element={<Component {...pageProps} />} location={location as any}>
                                <SeoFromRoute pageProps={pageProps} isNotFound={isNotFound} />
                                <SeoDocument pageProps={pageProps} isNotFound={isNotFound} />
                                <Wrapper />
                            </Provider>
                        </ArchiveProvider>
                    </UserProvider>
                </ToastProvider>
            </div>
        </AppErrorBoundary>
    )
}
