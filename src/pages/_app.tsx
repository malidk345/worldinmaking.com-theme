import { AppProps } from 'next/app'
import 'styles/global.css'
import { Provider } from 'context/App'
import { Provider as ToastProvider } from 'context/Toast'
import Wrapper from 'components/Wrapper'
import { useLocation } from '@gatsbyjs/reach-router'
import React from 'react'

export default function App({ Component, pageProps }: AppProps) {
    const location = useLocation()

    return (
        <div data-scheme="primary" suppressHydrationWarning className="h-screen w-screen overflow-hidden bg-light dark:bg-dark text-primary">
            <ToastProvider>
                <Provider element={<Component {...pageProps} />} location={location as any}>
                    <Wrapper />
                </Provider>
            </ToastProvider>
        </div>
    )
}
