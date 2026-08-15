import React, { Suspense } from 'react'
import dynamic from 'next/dynamic'
import hourglassAnimation from '../images/icons8-hourglass.json'
import hourglassAnimationWhite from '../images/icons8-hourglass-white.json'

const Lottie = dynamic(() => import('lottie-react'), { ssr: false, loading: () => null })

export default function HourglassLoader({ title = 'Loading...' }: { title?: string }) {
    return (
        <div className="flex items-center justify-center py-12">
            <Suspense fallback={null}>
                <Lottie
                    animationData={hourglassAnimation}
                    className="size-6 opacity-75 dark:hidden"
                    title={title}
                />
                <Lottie
                    animationData={hourglassAnimationWhite}
                    className="size-6 opacity-75 hidden dark:block"
                    title={title}
                />
            </Suspense>
        </div>
    )
}
