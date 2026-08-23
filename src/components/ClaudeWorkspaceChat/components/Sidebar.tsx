import React from 'react'
import { Chat } from '../types'
import { Plus, Trash2 } from 'lucide-react'

interface SidebarProps {
    isOpen: boolean
    onClose: () => void
    chats: Chat[]
    activeChatId?: string
    onSelectChat: (id: string) => void
    onNewChat: () => void
    onDeleteChat: (id: string) => void
    onRenameChat?: (id: string, newTitle: string) => void
    onToggleStarChat?: (id: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    onClose,
    chats,
    activeChatId,
    onSelectChat,
    onNewChat,
    onDeleteChat,
}) => {
    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    onClick={onClose}
                    className="absolute inset-0 z-20 bg-stone-950/20 backdrop-blur-xs md:hidden"
                />
            )}

            <aside
                data-scheme="secondary"
                className={`absolute inset-y-0 left-0 z-30 flex h-full w-64 shrink-0 flex-col bg-primary font-sans border-r border-primary transition-all duration-300 md:relative md:translate-x-0 ${
                    isOpen
                        ? 'translate-x-0 opacity-100'
                        : '-translate-x-full md:-ml-64 opacity-0 pointer-events-none'
                }`}
            >
                <div className="flex items-center justify-between px-3 pt-3 pb-1">
                    <span className="text-[13px] font-medium text-primary">Chats</span>
                </div>

                <div className="px-2 pb-2">
                    <button
                        onClick={() => {
                            onNewChat()
                            if (window.innerWidth < 1024) onClose()
                        }}
                        className="flex w-full items-center gap-2 rounded-md border border-primary/40 px-2.5 py-1.5 text-[13px] text-secondary hover:bg-accent hover:text-primary transition-colors cursor-pointer"
                    >
                        <Plus className="h-4 w-4" />
                        <span>New chat</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
                    {chats.length === 0 ? (
                        <div className="px-2 py-6 text-center text-xs text-muted">No chats yet</div>
                    ) : (
                        chats.map((chat) => (
                            <ChatItem
                                key={chat.id}
                                chat={chat}
                                isActive={activeChatId === chat.id}
                                onSelect={() => {
                                    onSelectChat(chat.id)
                                    if (window.innerWidth < 1024) onClose()
                                }}
                                onDelete={(e) => {
                                    e.stopPropagation()
                                    onDeleteChat(chat.id)
                                }}
                            />
                        ))
                    )}
                </div>
            </aside>
        </>
    )
}

interface ChatItemProps {
    chat: Chat
    isActive: boolean
    onSelect: () => void
    onDelete: (e: React.MouseEvent) => void
}

const ChatItem: React.FC<ChatItemProps> = ({
    chat,
    isActive,
    onSelect,
    onDelete,
}) => {
    return (
        <div
            onClick={onSelect}
            className={`group relative flex cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] font-sans transition-all duration-150 ${
                isActive
                    ? 'bg-accent border border-primary/40 text-primary font-semibold shadow-2xs'
                    : 'text-secondary border border-transparent hover:bg-accent/70 hover:text-primary'
            }`}
        >
            <span className="truncate pr-7">{chat.title || 'New chat'}</span>
            <div className="absolute right-1 flex items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                    onClick={onDelete}
                    className="p-1 rounded text-muted hover:text-rose-600 hover:bg-primary/10 transition-colors cursor-pointer"
                    title="Delete chat"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    )
}
