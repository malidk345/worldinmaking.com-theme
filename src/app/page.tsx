'use client'

import React from 'react'
import { Provider } from '../context/App'
import Wrapper from '../components/Wrapper'
import HomeTest from '../components/Home/Test'

export default function HomePage() {
    const location = typeof window !== 'undefined' ? window.location : ({ pathname: '/' } as any)
    const element = <HomeTest />

    return (
        <div className="h-screen w-screen overflow-hidden bg-light dark:bg-dark text-primary">
            <Provider element={element} location={location}>
                <Wrapper />
            </Provider>
        </div>
    )
}
