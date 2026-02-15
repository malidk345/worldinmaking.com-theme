"use client"
import React from 'react'
import { useParams } from 'next/navigation'
import Wrapper from 'components/Wrapper'
import SEO from 'components/SEO'

export const runtime = 'edge';

export default function TopicPage() {
    const params = useParams()
    const slug = params?.slug as string

    return (
        <main className="h-screen w-screen overflow-hidden bg-light dark:bg-dark">
            <SEO
                title={`Topic: ${slug}`}
                url={`/questions/topic/${slug}`}
            />
            <Wrapper />
        </main>
    )
}
