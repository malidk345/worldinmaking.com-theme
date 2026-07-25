import type { AppProps } from 'next/app'
import 'styles/global.css'
import { Provider } from 'context/App'
import { Provider as ToastProvider } from 'context/Toast'
import Wrapper from 'components/Wrapper'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'

export default function App({ Component, pageProps }: AppProps) {
    const router = useRouter()
    const pathname = router?.asPath ? router.asPath.split('?')[0] : '/'
    const location = { pathname, hash: '', search: '' }

    return (
        <div className="h-screen w-screen overflow-hidden bg-light dark:bg-dark text-primary">
            <ToastProvider>
                <Provider element={<Component {...pageProps} />} location={location as any}>
                    <Wrapper />
                </Provider>
            </ToastProvider>
        </div>
    )
}
