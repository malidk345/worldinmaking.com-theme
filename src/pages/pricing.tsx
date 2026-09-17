import React from 'react'
import dynamic from 'next/dynamic'

const PricingWindow = dynamic(() => import('../components/Pricing/PricingWindow'), {
    ssr: false,
})

export default function PricingPage() {
    return <PricingWindow />
}
