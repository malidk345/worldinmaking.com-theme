"use client"
import React from 'react'
import Wrapper from 'components/Wrapper'
import SEO from 'components/SEO'

export default function QuestionsPage() {
    return (
        <main className="h-screen w-screen overflow-hidden bg-light dark:bg-dark">
            <SEO
                title="Transmissions"
                description="Join the conversation on product, engineering, and making. Ask questions, share insights, and connect with the community."
                url="/questions"
            />
            <Wrapper />
        </main>
    )
}
