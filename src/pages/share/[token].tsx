import React from 'react'
import type { GetServerSideProps } from 'next'
import Link from 'next/link'
import { getSharedChatByToken, isChatStoreUnavailable } from '../../lib/chat-store'
import type { Chat } from '../../components/ClaudeWorkspaceChat/types'

type SharePageProps = {
    chat: Pick<Chat, 'id' | 'title' | 'modelId' | 'createdAt' | 'updatedAt' | 'messages'> | null
}

export default function SharedChatPage({ chat }: SharePageProps) {
    if (!chat) {
        return (
            <main className="min-h-screen bg-[#f4f4f5] text-stone-800 font-sans flex items-center justify-center p-6">
                <div className="max-w-md text-center space-y-3">
                    <h1 className="text-xl font-semibold">Sohbet bulunamadı</h1>
                    <p className="text-sm text-stone-500">Bu paylaşım linki geçersiz veya kapatılmış olabilir.</p>
                    <Link href="/desktop?open=chat" className="inline-block text-sm font-medium text-[#1E3A8A] hover:underline">
                        WIM sohbetine dön
                    </Link>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-[#f4f4f5] text-stone-800 font-sans">
            <header className="border-b border-stone-200 bg-white">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-[11px] uppercase tracking-wide text-stone-400">Paylaşılan sohbet</p>
                        <h1 className="text-lg font-semibold">{chat.title}</h1>
                    </div>
                    <Link href="/desktop?open=chat" className="text-sm font-medium text-[#1E3A8A] hover:underline shrink-0">
                        WIM Chat
                    </Link>
                </div>
            </header>
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
                {chat.messages.map((message) => (
                    <article key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'space-y-2'}>
                        {message.role === 'user' ? (
                            <div className="max-w-[85%] rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm whitespace-pre-wrap">
                                {message.content}
                            </div>
                        ) : (
                            <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
                        )}
                    </article>
                ))}
            </div>
        </main>
    )
}

export const getServerSideProps: GetServerSideProps<SharePageProps> = async (ctx) => {
    const token = typeof ctx.params?.token === 'string' ? ctx.params.token : ''
    if (!token) return { props: { chat: null } }
    try {
        const chat = await getSharedChatByToken(token)
        if (!chat) return { props: { chat: null } }
        return {
            props: {
                chat: {
                    id: chat.id,
                    title: chat.title,
                    modelId: chat.modelId,
                    createdAt: chat.createdAt,
                    updatedAt: chat.updatedAt,
                    messages: chat.messages.map((message) => ({
                        ...message,
                        thinkingProcess: undefined,
                        attachments: undefined,
                        osAction: undefined,
                    })),
                },
            },
        }
    } catch (err) {
        if (isChatStoreUnavailable(err)) return { props: { chat: null } }
        return { props: { chat: null } }
    }
}
