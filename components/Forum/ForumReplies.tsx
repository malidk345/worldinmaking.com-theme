"use client"

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ForumReplyCard from './ForumReplyCard'
import { ForumReply, ForumQuestion } from './types'
import ForumAvatar from './ForumAvatar'


interface ForumRepliesProps {
    replies: ForumReply[]
    question: ForumQuestion
    expanded: boolean
    onToggleExpanded: (expanded: boolean) => void
    isInForum?: boolean
}

export default function ForumReplies({
    replies,
    question,
    expanded,
    onToggleExpanded,
    isInForum = false,
}: ForumRepliesProps) {
    if (!replies || replies.length === 0) return null

    const replyCount = replies.length
    const avatars = Array.from(new Set(replies.map(r => r.profile.avatar))).filter(Boolean).slice(0, 3)
    const shouldExpandInline = expanded || replyCount < 3

    return (
        <ul className={`${isInForum ? 'ml-[-52px] w-[calc(100%+52px)]' : 'ml-5'} !mb-0 p-0 list-none relative flex flex-col gap-4`}>
            <AnimatePresence initial={false}>
            {!shouldExpandInline ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-4"
                >
                    <li className="!mb-0 relative">
                        {isInForum ? (
                            <div className="flex w-full gap-3 items-center">
                                <div className="w-[40px] shrink-0 flex justify-center items-center">
                                    <div className="flex items-center -space-x-1 py-0.5 px-1 rounded-full bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 shadow-sm">
                                        {avatars.map((avatar, index) => (
                                            <ForumAvatar key={index} image={avatar as string} className="w-[16px] h-[16px] border border-primary/20" />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex-grow min-w-0">
                                    <button
                                        className="text-xs font-semibold text-primary/60 hover:text-primary transition-colors lowercase"
                                        onClick={() => onToggleExpanded(true)}
                                    >
                                        view {replyCount - 1} other {replyCount - 1 === 1 ? 'reply' : 'replies'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="pb-4 -my-2 flex items-center space-x-4 pl-[30px] border-l border-dashed border-primary/20 squeak-left-border before:border-l-0">
                                <div className="flex items-center -space-x-2">
                                    {avatars.map((avatar, index) => (
                                        <ForumAvatar key={index} image={avatar as string} className="w-[25px] h-[25px] border-2 border-primary/40" />
                                    ))}
                                </div>
                                <button
                                    className="text-sm font-semibold text-primary hover:underline lowercase"
                                    onClick={() => onToggleExpanded(true)}
                                >
                                    view {replyCount - 1} more {replyCount - 1 === 1 ? 'reply' : 'replies'}
                                </button>
                            </div>
                        )}
                    </li>
                    <li className="!mb-0 relative">
                        {isInForum ? (
                            <div className="flex w-full gap-3">
                                <div className="w-[40px] shrink-0 flex justify-center items-start pt-1.5">
                                    <ForumAvatar
                                        className="size-8 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-[#1C1C1E] shadow-sm"
                                        image={replies[replies.length - 1].profile.avatar}
                                    />
                                </div>
                                <div className="flex-grow min-w-0">
                                    <ForumReplyCard 
                                        reply={replies[replies.length - 1]} 
                                        postId={question.id} 
                                        isInForum={isInForum} 
                                        questionAuthorId={question.profile.id} 
                                        repliedToUsername={replies.length === 1 ? question.profile.firstName : replies[replies.length - 2].profile.firstName}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="pl-[30px] border-l border-dashed border-primary/20 squeak-left-border before:border-l-0">
                                <ForumReplyCard 
                                    reply={replies[replies.length - 1]} 
                                    postId={question.id} 
                                    isInForum={isInForum} 
                                    questionAuthorId={question.profile.id} 
                                    repliedToUsername={replies.length === 1 ? question.profile.firstName : replies[replies.length - 2].profile.firstName}
                                />
                            </div>
                        )}
                    </li>
                </motion.div>
            ) : (
                replies.map((reply, index) => {
                    const repliedTo = index === 0 
                        ? question.profile.firstName 
                        : replies[index - 1].profile.firstName;
                    
                    return (
                        <motion.li layout
                            initial={{ opacity: 0, height: 0, y: -10 }}
                            animate={{ opacity: 1, height: "auto", y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -10 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                            key={reply.id}
                            className="!mb-0 relative"
                        >
                            {isInForum ? (
                                <div className="flex w-full gap-3">
                                    <div className="w-[40px] shrink-0 flex justify-center items-start pt-1.5">
                                        <ForumAvatar
                                            className="size-8 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-[#1C1C1E] shadow-sm"
                                            image={reply.profile.avatar}
                                        />
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <ForumReplyCard 
                                            reply={reply} 
                                            postId={question.id} 
                                            isInForum={isInForum} 
                                            questionAuthorId={question.profile.id} 
                                            repliedToUsername={repliedTo}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="pl-[30px] border-l border-dashed border-primary/20 squeak-left-border before:border-l-0">
                                    <ForumReplyCard 
                                        reply={reply} 
                                        postId={question.id} 
                                        isInForum={isInForum} 
                                        questionAuthorId={question.profile.id} 
                                        repliedToUsername={repliedTo}
                                    />
                                </div>
                            )}
                        </motion.li>
                    );
                })
            )}
        </AnimatePresence>
        </ul>
    )
}
