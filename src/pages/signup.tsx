import React from 'react'
import { useRouter } from 'next/router'
import Authentication from 'components/Squeak/components/Authentication'
import SEO from 'components/seo'
import WimLogo from 'components/WimLogo'

export default function SignupPage() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-primary text-primary flex items-center justify-center p-4">
            <SEO title="Sign up - WorldInMaking" />
            <div className="w-full max-w-md bg-primary border border-primary rounded-xl p-6 shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                    <WimLogo className="size-7" />
                    <span className="text-[11px] font-bold tracking-widest uppercase text-muted">
                        WorldInMaking
                    </span>
                </div>
                <Authentication
                    initialView="sign-up"
                    showBanner={false}
                    showProfile={false}
                    onAuth={() => {
                        router.push('/')
                    }}
                />
            </div>
        </div>
    )
}
