import React from 'react'
import dynamic from 'next/dynamic'
import { Provider } from '../../context/App'
import Wrapper from '../../components/Wrapper'

const Inbox = dynamic(() => import('../../components/Inbox'), { ssr: false })

export default function QuestionsIndexPage() {
    const location = typeof window !== 'undefined' ? window.location : ({ pathname: '/questions' } as any)
    return (
        <div className="h-screen w-screen overflow-hidden bg-light dark:bg-dark text-primary">
            <Provider element={<Inbox path="/questions" />} location={location}>
                <Wrapper />
            </Provider>
        </div>
    )
}
