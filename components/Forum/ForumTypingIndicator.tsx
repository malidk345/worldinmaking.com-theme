"use client"

import React, { useState, useEffect } from 'react'
import ForumAvatar from './ForumAvatar'

interface BotInfo {
    username: string
    avatar: string
}

const botList: BotInfo[] = [
    { username: 'Sofia', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sofia' },
    { username: 'Marcus', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Marcus' },
    { username: 'Eren', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Eren' },
    { username: 'Defne', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Defne' },
    { username: 'Kaan', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Kaan' },
    { username: 'Derin', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Derin' },
    { username: 'Zeynep', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Zeynep' },
    { username: 'Aria', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aria' },
    { username: 'Leo', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Leo' },
    { username: 'Lucas', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Lucas' }
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
        <div className="flex items-center space-x-2 pl-3 sm:pl-[calc(2.5rem_+_30px)] pr-3 sm:pr-8 py-3 text-primary opacity-60 transition-opacity duration-300">
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
