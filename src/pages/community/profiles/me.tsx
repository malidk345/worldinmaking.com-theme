import { useRouter } from 'next/router'
import React, { useEffect } from 'react'
import SEO from 'components/seo'
import { useUser } from 'hooks/useUser'
import { useApp } from '../../../context/App'
import OSButton from 'components/OSButton'
import ScrollArea from 'components/RadixUI/ScrollArea'

export default function MyProfilePage() {
    const router = useRouter()
    const { user, isValidating } = useUser()
    const { openSignIn } = useApp()

    useEffect(() => {
        if (!isValidating && user?.username) {
            router.replace(`/profile/${encodeURIComponent(user.username)}`)
        } else if (!isValidating && user?.profile?.id) {
            router.replace(`/profile/${encodeURIComponent(String(user.profile.id))}`)
        }
    }, [isValidating, user, router])

    if (isValidating || user?.profile?.id) {
        return (
            <div data-scheme="secondary" className="h-full bg-primary flex items-center justify-center">
                <div className="animate-pulse text-secondary text-sm">Loading...</div>
            </div>
        )
    }

    return (
        <div data-scheme="secondary" className="h-full bg-primary text-primary">
            <SEO title="My profile - PostHog" noindex />
            <ScrollArea className="min-h-0 h-full">
                <div data-scheme="primary" className="mx-auto max-w-md px-4 py-16 text-center">
                    <h1 className="text-2xl font-bold mb-2">View your profile</h1>
                    <p className="text-secondary mb-6">
                        Sign in to the community to view and edit your profile.
                    </p>
                    <OSButton
                        variant="primary"
                        size="lg"
                        onClick={() => {
                            openSignIn((user) => {
                                if (user?.profile?.id) {
                                    router.replace(
                                        user.username
                                            ? `/profile/${encodeURIComponent(user.username)}`
                                            : `/profile/${encodeURIComponent(String(user.profile.id))}`
                                    )
                                }
                            })
                        }}
                    >
                        Sign in
                    </OSButton>
                </div>
            </ScrollArea>
        </div>
    )
}
