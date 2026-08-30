import { useContext } from 'react'
import React, { createContext, useEffect, useState } from 'react'
import { ProfileData } from 'lib/strapi'
import usePostHog from './usePostHog'
import Link from 'components/Link'
import { useToast } from '../context/Toast'
import {
    getSessionAccessToken,
    loadCurrentWimUser,
    signInWithPassword,
    signOutWim,
    signUpWithPassword,
    signInWithGoogle,
    updatePassword as updateWimPassword,
} from 'lib/wim-auth'
import {
    addUserBookmark,
    fetchUserBookmarks,
    fetchUserPostLikes,
    removeUserBookmark,
    setPostLike,
    setReplyVote,
} from 'lib/wim-user-data'
import {
    dismissUserNotification,
    fetchUserNotifications,
    isThreadSubscribed,
    setThreadSubscription,
} from 'lib/wim-notifications'
import { supabase, isSupabaseConfigured } from 'lib/supabase'
import { AUTH_USER_ID_KEY, emitIdentityChanged } from 'lib/wim-identity'

// Sentinel value used by posthog-js for cookieless tracking mode
const COOKIELESS_SENTINEL_VALUE = '$posthog_cookieless'

// Legacy PostHog Squeak OAuth helpers — kept for type compatibility; WIM uses Supabase only.
const postPosthogAuth = async (
    _path: string,
    _body: Record<string, unknown>,
    _token?: string | null
): Promise<{ ok: boolean; data: any; error?: string }> => {
    return { ok: false, data: null, error: 'PostHog OAuth is not used on WorldInMaking. Sign in with email.' }
}

export type User = {
    /** Supabase auth.users.id (UUID string). Legacy Strapi used numbers. */
    id: number | string
    email: string
    isMember: boolean
    isModerator: boolean
    blocked: boolean
    confirmed: boolean
    createdAt: string
    provider: 'local' | 'github' | 'google' | 'posthog'
    username: string
    profile: {
        /** Supabase profiles.id (UUID). */
        id: number | string
    } & ProfileData
    role: {
        type: 'authenticated' | 'public' | 'moderator'
    }
    wallet: {
        balance: number
        transactions: {
            id: number
            amount: number
            date: Date
            type: 'achievement' | 'gift'
            metadata: any
        }[]
    }
    imageGenerationRateLimit?: {
        remaining: number
        limit: number
        resetTime: string | null
        windowMs: number
        monthlyCount: number
    }
    picasso?: boolean
    // Legacy PostHog OAuth flag — always false on WIM (Supabase-only).
    hasPosthogLogin?: boolean
}

export type DisambiguationResult = {
    status: 'needs_disambiguation'
    pendingToken: string
    emailInUse: boolean
}

type UserContextValue = {
    isLoading: boolean
    user: User | null
    isModerator: boolean
    setUser: React.Dispatch<React.SetStateAction<User | null>>
    fetchUser: (token?: string | null) => Promise<User | null>
    getJwt: () => Promise<string | null>
    login: (args: { email: string; password: string }) => Promise<User | null | { error: string }>
    loginWithGoogle: () => Promise<{ error?: string }>
    updatePassword: (password: string) => Promise<{ error?: string }>
    loginWithProvider: (args: {
        provider: 'posthog'
        accessToken: string
    }) => Promise<User | null | { error: string } | DisambiguationResult>
    createWithProvider: (args: { pendingToken: string }) => Promise<User | null | { error: string }>
    linkExisting: (args: {
        pendingToken: string
        identifier: string
        password: string
    }) => Promise<User | null | { error: string }>
    linkCurrent: (args: { accessToken: string }) => Promise<{ ok: true } | { error: string }>
    unlinkProvider: () => Promise<{ ok: true } | { error: string }>
    logout: () => Promise<void>
    signUp: (args: {
        email: string
        password: string
        firstName: string
        lastName: string
    }) => Promise<User | null | { error: string }>
    isSubscribed: (contentType: 'topic' | 'question', id: number | string) => Promise<boolean>
    setSubscription: (args: {
        contentType: 'topic' | 'question'
        id: number | string
        subscribe: boolean
        user?: User
    }) => Promise<void>
    likePost: (id: number, unlike?: boolean, slug?: string) => Promise<void>
    likeRoadmap: ({
        id,
        unlike,
        title,
        user,
    }: {
        id: number
        unlike?: boolean
        title?: string
        user?: User
    }) => Promise<void>
    notifications: any
    setNotifications: any
    isValidating: boolean
    voteReply: (id: number, vote: 'up' | 'down', user?: User) => Promise<void>
    addBookmark: (args: { url: string; title: string; description: string }) => Promise<void>
    removeBookmark: (args: { url: string; title: string; description: string }) => Promise<void>
    reportSpam: (type: 'reply' | 'question', id: number) => Promise<void>
}

export const UserContext = createContext<UserContextValue>({
    isLoading: true,
    user: null,
    isModerator: false,
    setUser: () => {
        // noop
    },
    fetchUser: async () => null,
    getJwt: async () => null,
    login: async () => null,
    loginWithGoogle: async () => ({}),
    updatePassword: async () => ({}),
    loginWithProvider: async () => null,
    createWithProvider: async () => null,
    linkExisting: async () => null,
    linkCurrent: async () => ({ error: '' }),
    unlinkProvider: async () => ({ error: '' }),
    logout: async () => {
        // noop
    },
    signUp: async () => null,
    isSubscribed: async () => false,
    setSubscription: async () => undefined,
    likePost: async () => undefined,
    likeRoadmap: async () => undefined,
    notifications: [],
    setNotifications: () => undefined,
    isValidating: true,
    voteReply: async () => undefined,
    addBookmark: async () => undefined,
    removeBookmark: async () => undefined,
    reportSpam: async () => undefined,
})

type UserProviderProps = {
    children: React.ReactNode
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(false)
    const [isValidating, setIsValidating] = useState(true)
    const [user, setUser] = useState<User | null>(null)
    const [jwt, setJwt] = useState<string | null>(null)
    const [notifications, setNotifications] = useState<any>([])
    const { addToast } = useToast()

    const posthog = usePostHog()

    const validateUser = async () => {
        try {
            if (isSupabaseConfigured) {
                // If URL has access_token or auth code, let onAuthStateChange establish the session
                if (typeof window !== 'undefined') {
                    const hash = window.location.hash || ''
                    const search = window.location.search || ''
                    if (hash.includes('access_token=') || search.includes('code=')) {
                        setIsValidating(false)
                        return
                    }
                    if (hash.includes('error_code=otp_expired') || search.includes('error_code=otp_expired')) {
                        addToast({
                            description: 'Giriş bağlantısının süresi dolmuş. Lütfen yeni bir giriş bağlantısı isteyin.',
                            error: true,
                            duration: 5000,
                        })
                        clearUser()
                        setIsValidating(false)
                        return
                    }
                }

                let token = await getSessionAccessToken()
                if (!token) {
                    const refreshResult = await supabase.auth.refreshSession()
                    token = refreshResult.data?.session?.access_token ?? null
                }
                if (token) {
                    setJwt(token)
                    localStorage.setItem('jwt', token)
                    const u = await fetchUser()
                    if (u) {
                        try {
                            localStorage.setItem(AUTH_USER_ID_KEY, String(u.id))
                            emitIdentityChanged()
                        } catch {
                            /* ignore */
                        }
                        setIsValidating(false)
                        return
                    }
                }
            }
            // Only clear user if there's genuinely no session (not a transient network error)
            clearUser()
        } catch (e) {
            console.warn('[useUser] validateUser', e)
            // Don't clearUser on network errors — keep existing localStorage state
            // so the user isn't forcefully logged out by a transient failure
        }
        setIsValidating(false)
    }

    useEffect(() => {
        validateUser()

        if (!isSupabaseConfigured) return
        const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                setUser(null)
                setJwt(null)
                localStorage.removeItem('jwt')
                localStorage.removeItem(AUTH_USER_ID_KEY)
                emitIdentityChanged()
                setIsValidating(false)
                return
            }
            if (session?.access_token) {
                setJwt(session.access_token)
                localStorage.setItem('jwt', session.access_token)
                const u = await fetchUser()
                if (u) {
                    setUser(u)
                    try {
                        localStorage.setItem(AUTH_USER_ID_KEY, String(u.id))
                    } catch {
                        /* ignore */
                    }
                }
            }
            setIsValidating(false)
        })
        return () => {
            sub.subscription.unsubscribe()
        }
    }, [])

    useEffect(() => {
        if (!user) return
        const tick = async () => {
            const notes = await fetchUserNotifications()
            setNotifications(notes)
        }
        const timer = window.setInterval(tick, 45_000)
        const onFocus = () => {
            void tick()
        }
        window.addEventListener('focus', onFocus)
        return () => {
            window.clearInterval(timer)
            window.removeEventListener('focus', onFocus)
        }
    }, [user?.id])

    const getJwt = async () => {
        const token = await getSessionAccessToken()
        if (token) {
            setJwt(token)
            return token
        }
        return jwt || localStorage.getItem('jwt')
    }

    // After Supabase password auth: store token, then full hydrate (profile + bookmarks + likes).
    const finalizeLogin = async (nextUser: User): Promise<User> => {
        const token = await getSessionAccessToken()
        if (token) {
            localStorage.setItem('jwt', token)
            setJwt(token)
        }
        try {
            localStorage.setItem(AUTH_USER_ID_KEY, String(nextUser.id))
            emitIdentityChanged()
        } catch {
            /* ignore */
        }
        setUser(nextUser)

        try {
            const distinctId = posthog?.get_distinct_id?.()
            if (distinctId && distinctId !== COOKIELESS_SENTINEL_VALUE && nextUser.email) {
                posthog?.identify?.(String(nextUser.id), {
                    email: nextUser.email,
                    username: nextUser.username,
                })
            }
        } catch (error) {
            console.error(error)
        }

        // Enrich bookmarks/likes via fetchUser (same session)
        const enriched = await fetchUser()
        return enriched || nextUser
    }

    const login = async ({
        email,
        password,
    }: {
        email: string
        password: string
    }): Promise<User | null | { error: string }> => {
        setIsLoading(true)

        try {
            posthog?.capture('wim login start')
            const { user: nextUser, error } = await signInWithPassword(email, password)
            if (error || !nextUser) {
                return { error: error || 'Invalid email or password' }
            }
            await finalizeLogin(nextUser)
            posthog?.capture('wim login success', { email })
            return nextUser
        } catch (error) {
            posthog?.capture('wim error', {
                source: 'useUser.login',
                email,
                error: JSON.stringify(error),
            })
            console.error(error)
            if (error instanceof Error) return { error: error.message }
            return null
        } finally {
            setIsLoading(false)
        }
    }

    const loginWithGoogle = async (): Promise<{ error?: string }> => {
        posthog?.capture('wim google login start')
        return signInWithGoogle()
    }

    const updatePassword = async (password: string): Promise<{ error?: string }> => {
        return updateWimPassword(password)
    }

    const loginWithProvider = async (_args: {
        provider: 'posthog'
        accessToken: string
    }): Promise<User | null | { error: string } | DisambiguationResult> => {
        return { error: 'PostHog OAuth is not available on WorldInMaking. Use email and password.' }
    }

    const createWithProvider = async (_args: {
        pendingToken: string
    }): Promise<User | null | { error: string }> => {
        return { error: 'PostHog OAuth is not available on WorldInMaking.' }
    }

    const linkExisting = async (_args: {
        pendingToken: string
        identifier: string
        password: string
    }): Promise<User | null | { error: string }> => {
        return { error: 'PostHog OAuth is not available on WorldInMaking.' }
    }

    const linkCurrent = async (_args: { accessToken: string }): Promise<{ ok: true } | { error: string }> => {
        return { error: 'PostHog account linking is not available on WorldInMaking.' }
    }

    const unlinkProvider = async (): Promise<{ ok: true } | { error: string }> => {
        return { error: 'PostHog account linking is not available on WorldInMaking.' }
    }

    const clearUser = async (): Promise<void> => {
        localStorage.removeItem('jwt')
        localStorage.removeItem('user')
        localStorage.removeItem(AUTH_USER_ID_KEY)
        emitIdentityChanged()
        setUser(null)
        setJwt(null)
        setNotifications([])
    }

    const logout = async (): Promise<void> => {
        posthog?.capture('wim logout')
        await signOutWim()
        clearUser()
        addToast({
            title: 'Signed out',
            description: 'You have been signed out of WorldInMaking.',
        })
    }

    const signUp = async ({
        email,
        password,
        firstName,
        lastName,
    }: {
        email: string
        password: string
        firstName: string
        lastName: string
    }): Promise<User | null | { error: string }> => {
        setIsLoading(true)

        try {
            posthog?.capture('wim signup start')
            const { user: nextUser, error, needsEmailConfirm } = await signUpWithPassword({
                email,
                password,
                firstName,
                lastName,
            })

            if (error || !nextUser) {
                return {
                    error:
                        error ||
                        (needsEmailConfirm
                            ? 'Check your email to confirm your account, then sign in.'
                            : 'Sign up failed'),
                }
            }

            await finalizeLogin(nextUser)
            posthog?.capture('wim signup success', { email })
            return nextUser
        } catch (error) {
            posthog?.capture('wim error', {
                type: 'useUser.signup',
                email,
                error: JSON.stringify(error),
            })
            console.error(error)
            if (error instanceof Error) return { error: error.message }
            return null
        } finally {
            setIsLoading(false)
        }
    }

    /** Hydrate current Supabase session into User (token arg ignored — session is source of truth). */
    const fetchUser = async (_token?: string | null): Promise<User | null> => {
        try {
            const meData = await loadCurrentWimUser()
            if (!meData) {
                posthog?.capture('community', { error: 'failed to fetch user' })
                return null
            }
            // Enrich with bookmarks + post likes from Supabase
            const uid = String(meData.id)
            const [bookmarks, postLikes, notes] = await Promise.all([
                fetchUserBookmarks(uid),
                fetchUserPostLikes(uid),
                fetchUserNotifications(),
            ])
            const enriched: User = {
                ...meData,
                profile: {
                    ...meData.profile,
                    bookmarks: bookmarks as User['profile']['bookmarks'],
                    postLikes: postLikes as any,
                },
            }
            setUser(enriched)
            setNotifications(notes)
            try {
                if (typeof window !== 'undefined') {
                    localStorage.setItem(AUTH_USER_ID_KEY, String(meData.id))
                    emitIdentityChanged()
                    window.dispatchEvent(new Event('wimNotebooksSync'))
                }
            } catch {
                /* ignore */
            }
            try {
                posthog?.setPersonProperties({
                    wimEmail: enriched.email,
                    wimUsername: enriched.username,
                    wimProfileId: enriched.profile?.id,
                    wimFirstName: enriched.profile?.firstName,
                    wimLastName: enriched.profile?.lastName,
                })
            } catch (error) {
                console.error(error)
            }
            return enriched
        } catch (e) {
            console.error(e)
            return null
        }
    }

    const isSubscribed = async (contentType: 'topic' | 'question', id: number | string) => {
        if (contentType !== 'question') return false
        return isThreadSubscribed(id)
    }

    const setSubscription = async (args: {
        contentType: 'topic' | 'question'
        id: number | string
        subscribe: boolean
        user?: User
    }): Promise<void> => {
        if (args.contentType !== 'question') return
        const result = await setThreadSubscription(args.id, args.subscribe)
        if (!result.ok) {
            addToast({ description: result.error || 'Could not update notifications', error: true })
        }
    }

    const likePost = async (id: number, unlike = false, slug = '') => {
        const result = await setPostLike(id, unlike, slug)
        if (!result.ok) {
            console.warn('[likePost]', result.error)
            return
        }
        posthog?.capture(unlike ? 'post downvote' : 'post upvote', { post: { id, url: slug } })
        // optimistic local update
        if (user?.profile) {
            const likes = ((user.profile as any).postLikes || []) as { id: string | number }[]
            const next = unlike ? likes.filter((p) => String(p.id) !== String(id)) : [...likes, { id }]
            setUser({ ...user, profile: { ...user.profile, postLikes: next as any } })
        }
    }

    const likeRoadmap = async ({
        id,
        unlike = false,
        title = '',
    }: {
        id: number
        unlike?: boolean
        title?: string
        user?: User
    }) => {
        // Roadmap likes share post_likes with id prefix
        await setPostLike(`roadmap:${id}`, unlike, title)
        posthog?.capture(unlike ? 'roadmap downvote' : 'roadmap upvote', { post: { id, title } })
    }

    const updateNotifications = async (next: any) => {
        const incoming = Array.isArray(next) ? next : []
        const removed = notifications
            .map((item: { id?: number }) => item?.id)
            .filter((id: number | undefined) => id != null && !incoming.some((item: { id?: number }) => item?.id === id))
        setNotifications(incoming)
        if (removed.length > 0) {
            await Promise.all(removed.map((id: number) => dismissUserNotification(id)))
        }
    }

    const voteReply = async (id: number, vote: 'up' | 'down', _user?: User) => {
        const result = await setReplyVote(id, vote)
        if (!result.ok) console.warn('[voteReply]', result.error)
    }

    const addBookmark = async ({ url, title, description }: { url: string; title: string; description: string }) => {
        if (!user?.profile) return
        const result = await addUserBookmark({ url, title, description })
        if (!result.ok) {
            addToast({ title: 'Could not save bookmark', description: result.error || 'Try again' })
            return
        }
        const bookmarks = [
            ...(user.profile.bookmarks?.filter((b) => b.url !== url) || []),
            { url, title, description, notes: '' },
        ]
        setUser({ ...user, profile: { ...user.profile, bookmarks } })
        addToast({
            title: 'Bookmark added',
            description: (
                <>
                    This page has been added to your{' '}
                    <Link to="/bookmarks" state={{ newWindow: true }} className="text-red dark:text-yellow font-bold">
                        bookmarks
                    </Link>
                    .
                </>
            ),
            onUndo: async () => {
                removeBookmark({ url, title, description })
            },
        })
    }

    const removeBookmark = async ({ url, title, description }: { url: string; title: string; description: string }) => {
        if (!user?.profile) return
        await removeUserBookmark({ url })
        setUser({
            ...user,
            profile: {
                ...user.profile,
                bookmarks: user.profile.bookmarks?.filter((b) => b.url !== url) || [],
            },
        })
        addToast({
            title: 'Bookmark removed',
            description: 'This page has been removed from your bookmarks.',
            onUndo: async () => {
                addBookmark({ url, title, description })
            },
        })
    }

    const reportSpam = async (_type: 'reply' | 'question', _id: number) => {
        /* Moderation queue TBD */
    }

    const contextValue = {
        user,
        setUser,
        isModerator: user?.role?.type === 'moderator',
        isLoading,
        getJwt,
        login,
        loginWithGoogle,
        updatePassword,
        loginWithProvider,
        createWithProvider,
        linkExisting,
        linkCurrent,
        unlinkProvider,
        logout,
        signUp,
        fetchUser,
        isSubscribed,
        setSubscription,
        likePost,
        likeRoadmap,
        notifications,
        setNotifications: updateNotifications,
        isValidating,
        voteReply,
        addBookmark,
        removeBookmark,
        reportSpam,
    }

    return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
}

export const useUser = () => {
    const user = useContext(UserContext)
    return user
}
