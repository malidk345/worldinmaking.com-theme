"use client"

import React, { useState, useEffect } from 'react'
import ForumAvatar from './ForumAvatar'

interface BotInfo {
    username: string
    avatar: string
}

const botList: BotInfo[] = [
    { username: 'Marx', avatar: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&q=80&w=150&h=150' },
    { username: 'Nietzsche', avatar: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=150&h=150' },
    { username: 'Deleuze', avatar: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=150&h=150' },
    { username: 'Zizek', avatar: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=150&h=150' },
    { username: 'Baudrillard', avatar: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=150&h=150' },
    { username: 'Derrida', avatar: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=150&h=150' },
    { username: 'Sartre', avatar: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=150&h=150' },
    { username: 'Lenin', avatar: 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&q=80&w=150&h=150' },
    { username: 'Arendt', avatar: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&q=80&w=150&h=150' },
    { username: 'Hegel', avatar: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=150&h=150' }
]

interface ForumTypingIndicatorProps {
    currentAuthorName?: string
}

export default function ForumTypingIndicator({ currentAuthorName }: ForumTypingIndicatorProps) {
    const [typingBot, setTypingBot] = useState<BotInfo | null>(null)

    useEffect(() => {
        // Exclude the author of the current post from typing to make it realistic
        const candidateBots = currentAuthorName 
            ? botList.filter(b => b.username.toLowerCase() !== currentAuthorName.toLowerCase())
            : botList

        // Wait 3.5 seconds after page loads, then pick a bot to start typing
        const startTimeout = setTimeout(() => {
            const randomBot = candidateBots[Math.floor(Math.random() * candidateBots.length)]
            setTypingBot(randomBot)
        }, 3500)

        // Bot types for 9 seconds, then stops
        const stopTimeout = setTimeout(() => {
            setTypingBot(null)
        }, 12500)

        return () => {
            clearTimeout(startTimeout)
            clearTimeout(stopTimeout)
        }
    }, [currentAuthorName])

    if (!typingBot) return null

    return (
        <div className="flex items-center space-x-2 py-1 text-primary opacity-60 transition-opacity duration-300">
            <ForumAvatar image={typingBot.avatar} className="size-[20px] rounded-full" />
            <span className="text-[11px] font-semibold lowercase tracking-tight">
                {typingBot.username} is formulating a perspective
            </span>
            <span className="flex space-x-0.5 items-center pb-1">
                <span className="size-0.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="size-0.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="size-0.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </span>
        </div>
    )
}
