'use client'

import React from 'react'
import { Provider } from '../../context/App'
import Wrapper from '../../components/Wrapper'
import DisplayOptions from '../../pages_gatsby_legacy/display-options'

export default function DisplayOptionsPage() {
    const location = typeof window !== 'undefined' ? window.location : ({ pathname: '/display-options' } as any)

    return (
        <div className="h-screen w-screen overflow-hidden bg-light dark:bg-dark text-primary">
            <Provider element={<DisplayOptions />} location={location}>
                <Wrapper />
            </Provider>
        </div>
    )
}
