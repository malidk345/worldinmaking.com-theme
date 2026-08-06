import React from 'react'
import { useUser } from 'hooks/useUser'
import { useToast } from '../../../context/Toast'
import { CallToAction } from 'components/CallToAction'
import { Logo } from './Logo'

/**
 * WIM: PostHog OAuth / Squeak connect is disabled (Supabase email/password only).
 * Kept so profile-edit layout does not crash.
 */
const ConnectedAccounts: React.FC<{ hideHeading?: boolean; stacked?: boolean }> = ({
    hideHeading = false,
    stacked = false,
}) => {
    const { user } = useUser()
    const { addToast } = useToast()

    if (!user) return null

    return (
        <div data-scheme="primary" className="space-y-2">
            {!hideHeading && <h2>Connected accounts</h2>}
            <div className={`flex gap-3 @container ${stacked ? 'flex-col' : 'items-center justify-between'}`}>
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center size-10 shrink-0 rounded border border-primary bg-primary">
                        <Logo layout="logomark" className="h-5 w-auto" />
                    </div>
                    <div className="min-w-0">
                        <p className="m-0 font-semibold leading-tight">Email (Supabase)</p>
                        <p className="m-0 text-sm text-muted">
                            Signed in as {user.email}. Social/OAuth linking is not used on WorldInMaking.
                        </p>
                    </div>
                </div>
                <div className={`flex items-center gap-2 ${stacked ? 'justify-between' : 'shrink-0'}`}>
                    <CallToAction
                        type="secondary"
                        size="sm"
                        onClick={() =>
                            addToast({
                                title: 'Not available',
                                description: 'Account linking uses email/password only on this site.',
                            })
                        }
                    >
                        Manage
                    </CallToAction>
                </div>
            </div>
        </div>
    )
}

export default ConnectedAccounts
