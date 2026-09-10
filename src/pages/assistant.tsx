import React from 'react'
import dynamic from 'next/dynamic'

export const runtime = 'edge'

const AssistantWindow = dynamic(() => import('components/AssistantWindow'), { ssr: false })

export default function AssistantPage() {
    return <AssistantWindow />
}
