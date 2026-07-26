import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Provider } from '../../context/App'
import Wrapper from '../../components/Wrapper'

const Inbox = dynamic(() => import('../../components/Inbox'), { ssr: false })

export default function QuestionsIndexPage() {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className="h-screen w-screen bg-light dark:bg-dark text-primary" />
    }

    const location = typeof window !== 'undefined' ? window.location : ({ pathname: '/questions' } as any)

    return (
        <div className="h-screen w-screen overflow-hidden bg-light dark:bg-dark text-primary">
            <Provider element={<Inbox path="/questions" />} location={location}>
                <Wrapper />
            </Provider>
        </div>
    )
}
