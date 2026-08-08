import React, { useEffect, useState } from 'react'
import { useToast } from '../../context/Toast'
import usePostHog from '../../hooks/usePostHog'

export default function CookieBannerToast() {
    const { addToast } = useToast()
    const posthog = usePostHog()
    const [hasShownBanner, setHasShownBanner] = useState(false)

    useEffect(() => {
        const consent = localStorage.getItem('cookie_consent')

        if (!consent && !hasShownBanner) {
            setHasShownBanner(true)
            localStorage.setItem('cookie_consent', 'acknowledged')
            posthog?.set_config({ persistence: 'localStorage+cookie' })
            addToast({
                title: 'World In Making',
                description: (
                    <>
                        <p className="mt-1">
                            We do not track you. There are no cookies, no accept buttons. Just experience.
                        </p>
                    </>
                ),
                verticalAlign: 'items-start',
                duration: 8000,
            })
        }
    }, [addToast, posthog, hasShownBanner])

    return null
}
