import type { AppProps } from 'next/app'
import { Provider } from 'context/App'
import { Provider as ToastProvider } from 'context/Toast'
import Wrapper from 'components/Wrapper'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'

export default function App({ Component, pageProps }: AppProps) {
    const router = useRouter()
    const location = { pathname: router.asPath || '/' }
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    return (
        <div className="h-screen w-screen overflow-hidden bg-light dark:bg-dark text-primary">
            <ToastProvider>
                <Provider element={<Component {...pageProps} />} location={location as any}>
                    {mounted ? <Wrapper /> : <div className="h-full w-full bg-slate-950" />}
                </Provider>
            </ToastProvider>
        </div>
    )
}
