import React from 'react'
import dynamic from 'next/dynamic'
import { getRuntimeEnv } from 'lib/bots/runtime-env'
import { lemonSqueezyMissingConfig } from 'lib/wim-billing'

export const runtime = 'edge'

const PricingWindow = dynamic(() => import('../components/Pricing/PricingWindow'), {
    ssr: false,
})

export async function getServerSideProps() {
    const env = getRuntimeEnv()
    const missing = lemonSqueezyMissingConfig(env)
    return {
        props: {
            checkoutAvailable: missing.length === 0,
        },
    }
}

export default function PricingPage({ checkoutAvailable }: { checkoutAvailable?: boolean }) {
    return <PricingWindow checkoutAvailable={checkoutAvailable !== false} />
}
