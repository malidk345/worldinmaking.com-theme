import React from 'react'
import { useRouter } from 'next/router'
import PublicProfile from 'components/Profile/PublicProfile'
import SEO from 'components/seo'

export default function ProfilePage() {
    const router = useRouter()
    const { username } = router.query

    const normalizedUsername = Array.isArray(username) ? username[0] : username || ''

    return (
        <>
            <SEO title={`${normalizedUsername ? normalizedUsername + "'s Profile" : 'Profile'} - PostHog`} />
            <div className="h-full w-full bg-light dark:bg-dark overflow-auto">
                <PublicProfile username={normalizedUsername} />
            </div>
        </>
    )
}
