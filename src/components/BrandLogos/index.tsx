import React from 'react'
import WimLogo from 'components/WimLogo'

/** Site mark. PostHog brand lockups were removed. */
export function BrandLogos(): JSX.Element {
    return (
        <div className="flex items-center gap-3">
            <WimLogo className="size-10" />
            <span className="text-sm text-secondary">WorldInMaking</span>
        </div>
    )
}

export default BrandLogos
