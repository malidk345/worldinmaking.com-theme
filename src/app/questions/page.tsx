'use client'

import React from 'react'
import { Provider } from '../../context/App'
import Wrapper from '../../components/Wrapper'
import Inbox from '../../components/Inbox'

export default function QuestionsPage() {
    const location = typeof window !== 'undefined' ? window.location : ({ pathname: '/questions' } as any)

    return (
        <div className="h-screen w-screen overflow-hidden bg-light dark:bg-dark text-primary">
            <Provider element={<Inbox path="/questions" />} location={location}>
                <Wrapper />
            </Provider>
        </div>
    )
}
