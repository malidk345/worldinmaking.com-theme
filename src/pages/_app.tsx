import { AppProps } from 'next/app'
import '../styles/global.css'
import '../components/Careers/InterviewProcess/index.css'
import '../components/HiddenSection/style.css'
import '../components/Layout/Fonts.css'
import '../components/Layout/SkeletonLoading.css'
import '../components/MdxAnchorHeaders/style.css'
import '../components/RadixUI/css/toast.css'
import '../components/Spacer/style.css'
import '../components/Corpus/styles.css'
import 'react-medium-image-zoom/dist/styles.css'
import 'rc-slider/assets/index.css'
import '../components/Pricing/PricingSlider/slider.css'
// Do NOT import components/LemonUI/lemon-ui.css globally.
// That thin stylesheet restyles .LemonButton with padding/border and fights the full
// PostHog LemonButton chrome (.LemonButton + .LemonButton__chrome frame). Full styles
// load via ensureLemonStyles() / <LemonScope> / notebook App (NOTEBOOK_APP_CSS).
import '../components/MarkdownNotebook/MarkdownNotebook.scss'
import { Provider } from 'context/App'
import { Provider as ToastProvider } from 'context/Toast'
import Wrapper from 'components/Wrapper'
import { useRouter } from 'next/router'
import React from 'react'

export default function App({ Component, pageProps }: AppProps) {
    const router = useRouter()
    const [location, setLocation] = React.useState(() => {
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

    // Pages that set `Component.noLayout = true` render without the standard wrapper
    // so full-screen embeds (e.g. /notebooks) can fill the entire viewport.
    if ((Component as any).noLayout) {
        return <Component {...pageProps} />
    }

    return (
        <div
            data-scheme="primary"
            suppressHydrationWarning
            className="h-dvh min-h-0 w-screen overflow-hidden bg-light dark:bg-dark text-primary"
        >
            <ToastProvider>
                <Provider element={<Component {...pageProps} />} location={location as any}>
                    <Wrapper />
                </Provider>
            </ToastProvider>
        </div>
    )
}
