import React from 'react'
import { CallToAction } from 'components/CallToAction'
import WimLogo from 'components/WimLogo'
import { useToast } from '../../../../context/Toast'

interface PostHogButtonProps {
    label?: string
    className?: string
}

/** WIM: PostHog OAuth via Squeak is disabled. Button is a no-op with toast. */
const PostHogButton: React.FC<PostHogButtonProps> = ({ label = 'Sign in with PostHog', className = '' }) => {
    const { addToast } = useToast()

    const handleClick = () => {
        addToast({
            title: 'Not available',
            description: 'Use email and password to sign in on WorldInMaking.',
        })
    }

    return (
        <CallToAction type="secondary" size="sm" width="full" className={className} onClick={handleClick}>
            <span className="flex items-center justify-center gap-2">
                <WimLogo className="h-4 w-4" />
                {label}
            </span>
        </CallToAction>
    )
}

export default PostHogButton
