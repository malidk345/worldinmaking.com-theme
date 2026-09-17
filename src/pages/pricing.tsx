import React from 'react'
import { getRuntimeEnv } from 'lib/bots/runtime-env'
import { lemonSqueezyMissingConfig } from 'lib/wim-billing'
import PricingWindow from '../components/Pricing/PricingWindow'

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
