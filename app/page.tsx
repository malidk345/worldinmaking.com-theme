"use client"

import React from 'react'
import Wrapper from 'components/Wrapper'

import Link from 'next/link'

export default function Home() {
    return (
        <main className="h-[100dvh] w-screen overflow-hidden bg-light dark:bg-dark">
            <Wrapper />
            <nav className="sr-only">
                <ul>
                    <li><Link href="/posts">Posts</Link></li>
                    <li><Link href="/questions">Questions</Link></li>
                    <li><Link href="/contact">Contact</Link></li>
                    <li><Link href="/archive">Archive</Link></li>
                    <li><Link href="/arena">Arena</Link></li>
                </ul>
            </nav>
        </main>
    )
}
