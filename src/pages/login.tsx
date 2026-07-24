import React from 'react'
import { useRouter } from 'next/router'
import WimAuthPortal from 'components/Auth/WimAuthPortal'
import Layout from 'components/Layout'

export default function LoginPage() {
    const router = useRouter()

    return (
        <Layout>
            <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 bg-slate-950">
                <WimAuthPortal
                    defaultTab="signin"
                    onSuccess={() => {
                        router.push('/')
                    }}
                />
            </div>
        </Layout>
    )
}
