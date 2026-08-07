import React from 'react'
import { useRouter } from 'next/router'
import Authentication from 'components/Squeak/components/Authentication'
import SEO from 'components/seo'

export default function SignupPage() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-primary text-primary flex items-center justify-center p-4">
            <SEO title="Sign up - WorldInMaking" />
            <div className="w-full max-w-md bg-primary border border-primary rounded-xl p-6 shadow-2xl">
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
