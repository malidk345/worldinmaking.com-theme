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
        <ul className={`${isInForum ? 'ml-[36px] sm:ml-[40px] pr-4 sm:pr-6 md:pr-8' : 'ml-5'} !mb-0 p-0 list-none`}>
            <AnimatePresence initial={false}>
            {!shouldExpandInline ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <li className="!mb-0 relative pr-[5px] pl-[30px] border-l border-dashed border-primary/20 squeak-left-border before:border-l-0">
                        {isInForum ? (
                            <div className="pb-2 justify-start flex items-center w-full relative">
                                <div className="flex items-center -space-x-2 mr-3">
                                    {avatars.map((avatar, index) => (
                                        <ForumAvatar key={index} image={avatar as string} className="w-[22px] h-[22px] border-2 border-primary/40" />
                                    ))}
                                </div>
                                <button
                                    className="text-xs font-semibold text-[#000080] dark:text-[#66b2ff] hover:underline lowercase"
                                    onClick={() => onToggleExpanded(true)}
                                >
                                    view {replyCount - 1} other {replyCount - 1 === 1 ? 'reply' : 'replies'}
                                </button>
                            </div>
                        ) : (
                            <div className="pb-4 -my-2 flex items-center space-x-4">
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
                    <li className="pr-[5px] !mb-0 relative pl-[30px] border-l border-dashed border-primary/20 squeak-left-border before:border-l-0">
                        <ForumReplyCard 
                            reply={replies[replies.length - 1]} 
                            postId={question.id} 
                            isInForum={isInForum} 
                            questionAuthorId={question.profile.id} 
                            repliedToUsername={replies.length === 1 ? question.profile.firstName : replies[replies.length - 2].profile.firstName}
                        />
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
                            className="pr-[5px] !mb-0 relative pb-4 pl-[30px] border-l border-dashed border-primary/20 squeak-left-border before:border-l-0"
                        >
                            <ForumReplyCard 
                                reply={reply} 
                                postId={question.id} 
                                isInForum={isInForum} 
                                questionAuthorId={question.profile.id} 
                                repliedToUsername={repliedTo}
                            />
                        </motion.li>
                    );
                })
            )}
        </AnimatePresence>
        </ul>
    )
}
