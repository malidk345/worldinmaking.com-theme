import React, { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useApp } from 'context/App'
import Layout from 'components/Layout'

export default function LoginPage() {
    const router = useRouter()
    const { openSignIn } = useApp()

    useEffect(() => {
        openSignIn(() => {
            router.push('/')
        })
    }, [])

    return (
        <Layout>
            <div className="min-h-[80vh] flex items-center justify-center p-4">
                <div className="text-center text-muted font-medium text-sm">
                    Opening sign in window...
                </div>
            </div>
        </Layout>
    )
}
