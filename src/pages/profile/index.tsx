import React, { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useUser } from 'hooks/useUser'
import { useApp } from 'context/App'
import OSButton from 'components/OSButton'
import SEO from 'components/seo'

export default function ProfileIndexPage() {
    const router = useRouter()
    const { user, isValidating } = useUser()
    const { openSignIn } = useApp()

    useEffect(() => {
        if (!isValidating && user?.username) {
            router.replace(`/profile/${encodeURIComponent(user.username)}`)
        }
    }, [isValidating, user, router])

    if (isValidating || user?.username) {
        return (
            <div className="h-full bg-primary flex items-center justify-center p-8">
                <div className="animate-pulse text-secondary text-sm">Loading profile...</div>
            </div>
        )
    }

    return (
        <div className="h-full bg-primary text-primary flex items-center justify-center p-6">
            <SEO title="User Profile - PostHog" />
            <div className="max-w-md w-full text-center p-6 bg-accent border border-primary rounded-2xl shadow-xl">
                <h1 className="text-xl font-bold mb-2">View Your Profile</h1>
                <p className="text-sm text-secondary mb-6">
                    Sign in to access your author profile, view your posts and saved documents.
                </p>
                <OSButton
                    variant="primary"
                    size="md"
                    width="full"
                    onClick={() => {
                        openSignIn((signedInUser) => {
                            if (signedInUser?.username) {
                                router.replace(`/profile/${encodeURIComponent(signedInUser.username)}`)
                            }
                        })
                    }}
                >
                    Sign In
                </OSButton>
            </div>
        </div>
    )
}
