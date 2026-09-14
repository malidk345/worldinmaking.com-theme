import { useState } from 'react'
import type { User } from 'hooks/useUser'

export function useAuthBridge() {
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
    const [authModalView, setAuthModalView] = useState<'sign-in' | 'sign-up' | 'forgot-password'>('sign-in')
    const [authModalOnSuccess, setAuthModalOnSuccess] = useState<((user: User) => void) | null>(null)

    const openSignIn = (onSuccess?: (user: User) => void) => {
        setAuthModalView('sign-in')
        setAuthModalOnSuccess(() => onSuccess || null)
        setIsAuthModalOpen(true)
    }

    const openRegister = () => {
        setAuthModalView('sign-up')
        setAuthModalOnSuccess(null)
        setIsAuthModalOpen(true)
    }

    const openForgotPassword = () => {
        setAuthModalView('forgot-password')
        setAuthModalOnSuccess(null)
        setIsAuthModalOpen(true)
    }

    return {
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalView,
        setAuthModalView,
        authModalOnSuccess,
        setAuthModalOnSuccess,
        openSignIn,
        openRegister,
        openForgotPassword
    }
}
