"use client"

import React from 'react'

export default function ForumQuestionSkeleton({ isInForum = false }: { isInForum?: boolean }) {
    return (
        <div className={`animate-pulse flex space-x-4 ${isInForum ? 'p-5' : ''}`}>
            <div className="w-[40px] h-[40px] bg-accent rounded-full flex-shrink-0" />
            <div className="w-full">
                <div className="flex items-center space-x-2">
                    <div className="h-[17px] bg-accent w-[40px] rounded-md" />
                    <div className="h-[17px] bg-accent w-[80px] rounded-md" />
                </div>
                <div className="w-full bg-accent h-[18px] rounded-md mt-2" />
                <div className="w-full bg-accent h-[200px] rounded-md mt-2" />
            </div>
        </div>
    )
}
