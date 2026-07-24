import React, { useRef, useState } from 'react'
import { CallToAction } from 'components/CallToAction'
import { useUser } from 'hooks/useUser'
import Input from 'components/OSForm/input'
import { IconSpinner } from '@posthog/icons'

interface PostHogDisambiguationProps {
    pendingToken: string
    emailInUse: boolean
    onSuccess: () => void
}

// Shown on the OAuth landing page when a non-employee PostHog login matches no
// linked account: let them create a fresh community account, or prove ownership
// of an existing one (any email) and link it. When the OAuth email already maps
// to an account we skip straight to the link form.
const PostHogDisambiguation: React.FC<PostHogDisambiguationProps> = ({ pendingToken, emailInUse, onSuccess }) => {
    const { createWithProvider, linkExisting } = useUser()
    const [mode, setMode] = useState<'choose' | 'link'>(emailInUse ? 'link' : 'choose')
    const [identifier, setIdentifier] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    // Synchronous re-entrancy guard: the submit CallToAction fires both its onClick
    // AND the form's native submit in one click, so a state-based `busy` flag (async)
    // wouldn't block the second call — a ref set before any await does.
    const inFlight = useRef(false)

    const handleCreate = async () => {
        if (inFlight.current) return
        inFlight.current = true
        setBusy(true)
        setError(null)
        try {
            const res = await createWithProvider({ pendingToken })
            if (!res || 'error' in res) {
                return setError((res && 'error' in res && res.error) || 'Could not create your account.')
            }
            onSuccess()
        } finally {
            inFlight.current = false
            setBusy(false)
        }
    }

    const handleLink = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (inFlight.current) return
        inFlight.current = true
        setBusy(true)
        setError(null)
        try {
            const res = await linkExisting({ pendingToken, identifier, password })
            if (!res || 'error' in res) {
                return setError((res && 'error' in res && res.error) || 'Could not connect your account.')
            }
            onSuccess()
        } finally {
            inFlight.current = false
            setBusy(false)
        }
    }

    return (
        <div className="size-full">
            null
        </div>
    )
}

export default PostHogDisambiguation
