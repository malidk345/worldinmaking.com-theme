import React from 'react'
import Authentication from 'components/Squeak/components/Authentication'

type WimAuthPortalProps = {
    onSuccess?: () => void
    defaultTab?: 'signin' | 'signup'
}

export const WimAuthPortal: React.FC<WimAuthPortalProps> = ({ onSuccess, defaultTab = 'signin' }) => {
    return (
        <div className="w-full max-w-lg mx-auto p-4">
            <Authentication
                initialView={defaultTab === 'signup' ? 'sign-up' : 'sign-in'}
                showBanner={false}
                showProfile={false}
                onAuth={() => {
                    onSuccess?.()
                }}
            />
        </div>
    )
}

export default WimAuthPortal
