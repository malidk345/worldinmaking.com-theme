import React, { useEffect, useState } from 'react'
import { useLayoutData } from 'components/Layout/hooks'
import usePostHog from 'hooks/usePostHog'
import { useLocation } from 'hooks/useLocation'

const SmallCookieBanner = ({ handleClick }: { handleClick: (accept: boolean) => void }) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 z-[999999] bg-accent dark:bg-accent-dark border-t border-border dark:border-border-dark p-4 shadow-lg">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-primary dark:text-primary-dark m-0">
                    We use cookies to improve your experience and analyze traffic.
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleClick(false)}
                        className="bg-orange dark:bg-button-secondary-shadow-dark dark:border-button-secondary-dark border-[1.5px] relative top-px rounded-[8px] text-primary inline-block border-button text-center group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="relative text-center w-auto bg-white text-primary hover:text-primary dark:text-primary-dark dark:hover:text-primary-dark border-button dark:border-orange dark:bg-dark rounded-[8px] text-[14px] font-bold border-[1.5px] px-3 py-1 -translate-y-0.5 hover:-translate-y-1 active:-translate-y-0.5 mx-[-1.5px] group-disabled:hover:!-translate-y-1 group-disabled:hover:!translate-y-0 block active:transition-all active:duration-100 select-none ">
                            Decline
                        </span>
                    </button>
                    <button
                        onClick={() => handleClick(true)}
                        className="bg-button-shadow dark:bg-button-shadow-dark border-[1.5px] relative top-px rounded-[8px] text-primary inline-block border-button text-center group disabled:opacity-50 disabled:cursor-not-allowed shadow-none box-border"
                    >
                        <span className="relative text-center w-auto bg-orange text-primary hover:text-primary dark:text-primary dark:hover:text-primary border-button dark:border-button-dark dark:bg-orange rounded-[8px] text-[14px] font-bold border-[1.5px] px-3 py-1 -translate-y-0.5 hover:-translate-y-1 active:-translate-y-0.5 mx-[-1.5px] group-disabled:hover:!-translate-y-1 group-disabled:hover:!translate-y-0 block active:transition-all active:duration-100 select-none">
                            Accept
                        </span>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function CookieBanner() {
    const posthog = usePostHog()
    const { internalMenu } = useLayoutData()
    const [consentGiven, setConsentGiven] = useState('')
    const { pathname, state } = useLocation()
    const paidAdsCookieBannerExperimentVariant = posthog?.getFeatureFlag?.('show-bottom-bar-cookie-banner')

    const handleClick = (accept: boolean) => {
        localStorage.setItem('cookie_consent', accept ? 'yes' : 'no')
        setConsentGiven(accept ? 'yes' : 'no')
    }

    useEffect(() => {
        if (['yes', 'no'].includes(consentGiven)) {
            posthog?.set_config({ persistence: consentGiven === 'yes' ? 'localStorage+cookie' : 'memory' })
        }
    }, [consentGiven])

    useEffect(() => {
        const consent = localStorage.getItem('cookie_consent')
        if (!consent) {
            setConsentGiven('undecided')
        } else {
            setConsentGiven(consent)
        }
    }, [])

    if (consentGiven !== 'undecided') {
        return null
    }

    const isOnPaidAdsLandingPage =
        pathname?.includes('/newsletter-fbc') || (state as { isComingFromAd?: boolean })?.isComingFromAd
    if (isOnPaidAdsLandingPage && paidAdsCookieBannerExperimentVariant === 'test') {
        return <SmallCookieBanner handleClick={handleClick} />
    }

    return null
}
