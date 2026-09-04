import React from 'react'
import WimLogo from 'components/WimLogo'

/** Forum chrome uses the WIM mark. Extra props are ignored (legacy PostHog Logo API). */
export function Logo({ className = 'h-4 w-auto' }: { className?: string; [key: string]: unknown }) {
    return <WimLogo className={className} />
}

export default Logo
