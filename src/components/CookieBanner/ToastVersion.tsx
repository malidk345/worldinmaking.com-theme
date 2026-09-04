import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import WimLogo from 'components/WimLogo'
import OSButton from 'components/OSButton'
import Link from 'components/Link'
import { hasConsentDecision, writeConsent } from 'lib/wim-consent'
import { applyAnalyticsConsent } from 'lib/wim-posthog'

const WORD_CYCLE = {
    duration: 5.4,
    times: [0, 0.14, 0.32, 0.68, 0.86, 1],
    repeat: Infinity,
    ease: [0.4, 0, 0.2, 1] as const,
}

function Fold({ letters }: { letters: string }) {
    const reduce = useReducedMotion()
    const open = `${letters.length}ch`
    return (
        <motion.span
            aria-hidden
            className="inline-block overflow-hidden align-bottom whitespace-nowrap"
            initial={{ maxWidth: 0 }}
            animate={{ maxWidth: reduce ? 0 : [0, 0, open, open, 0, 0] }}
            transition={WORD_CYCLE}
        >
            {letters}
        </motion.span>
    )
}

/** w / i / m stay; other letters fold out between them: wim ↔ worldinmaking */
function WimWord() {
    return (
        <p className="text-sm font-semibold m-0 leading-tight lowercase whitespace-nowrap" aria-label="wim">
            <span>w</span>
            <Fold letters="orld" />
            <span>i</span>
            <Fold letters="n" />
            <span>m</span>
            <Fold letters="aking" />
        </p>
    )
}

export default function CookieBannerToast() {
    const [open, setOpen] = useState(false)

    useEffect(() => {
        setOpen(!hasConsentDecision())
    }, [])

    const choose = (accepted: boolean) => {
        writeConsent(accepted ? 'yes' : 'no')
        applyAnalyticsConsent(accepted)
        setOpen(false)
    }

    if (!open || typeof document === 'undefined') return null

    return createPortal(
        <div
            role="dialog"
            aria-label="Cookies and analytics"
            data-scheme="primary"
            className="pointer-events-auto fixed bottom-4 left-4 z-[90] w-[min(22.5rem,calc(100vw-2rem))] rounded border border-primary bg-primary text-primary shadow-xl"
        >
            <div className="flex gap-3 p-3">
                <WimLogo className="size-8 shrink-0 mt-0.5" />
                <div className="min-w-0 space-y-2">
                    <WimWord />
                    <p className="text-xs text-secondary m-0 leading-relaxed">
                        The desk stores sign-in and window layout on this device. Optional product analytics measure how
                        the site is used. No ads.{' '}
                        <Link href="/cookies" className="underline hover:text-primary">
                            Cookies
                        </Link>
                    </p>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                        <OSButton size="sm" onClick={() => choose(false)}>
                            Decline
                        </OSButton>
                        <OSButton size="sm" variant="primary" onClick={() => choose(true)}>
                            Accept
                        </OSButton>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}
