"use client"

import Link from 'next/link'
import { useTranslation } from 'hooks/useTranslation'
import { useEffect } from 'react'

export default function NotFound() {
    const { t } = useTranslation()

    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.title = t('notfound.title')
        }
    }, [t])

    return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-light px-6 text-center dark:bg-dark">
            <h1 className="text-9xl font-black text-burnt-orange opacity-20">404</h1>
            <div className="relative -mt-16">
                <h2 className="mb-4 text-3xl font-bold text-primary-text lowercase tracking-tight">
                    {t('notfound.lost')}
                </h2>
                <p className="mb-8 max-w-md text-primary-text/60 lowercase">
                    {t('notfound.lost_desc')}
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-md bg-burnt-orange px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-burnt-orange/90 active:scale-95 lowercase"
                >
                    {t('notfound.return_btn')}
                </Link>
            </div>

            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none opacity-50">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-burnt-orange/5 rounded-full blur-[120px]" />
            </div>
        </div>
    )
}
