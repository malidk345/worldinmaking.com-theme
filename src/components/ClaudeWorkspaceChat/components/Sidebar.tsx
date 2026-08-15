import React, { useState } from 'react'
import { PANEL_BG } from '../../../constants/frostedSurfaces'
import { Chat } from '../types'
import { Plus, Search, PanelLeft, Star, Trash2, Edit2, Check, X } from 'lucide-react'

interface SidebarProps {
    isOpen: boolean
    onClose: () => void
    chats: Chat[]
    activeChatId?: string
    onSelectChat: (id: string) => void
    onNewChat: () => void
    onDeleteChat: (id: string) => void
    onRenameChat: (id: string, newTitle: string) => void
    onToggleStarChat: (id: string) => void
    onOpenSearchModal: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    onClose,
    chats,
    activeChatId,
    onSelectChat,
    onNewChat,
    onDeleteChat,
    onRenameChat,
    onToggleStarChat,
    onOpenSearchModal,
}) => {
    const [editingChatId, setEditingChatId] = useState<string | null>(null)
    const [editTitle, setEditTitle] = useState('')

    const handleStartRename = (e: React.MouseEvent, chat: Chat) => {
        e.stopPropagation()
        setEditingChatId(chat.id)
        setEditTitle(chat.title)
    }

    const handleSaveRename = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (editTitle.trim()) onRenameChat(id, editTitle.trim())
        setEditingChatId(null)
    }

    return (
        <>
            {isOpen && (
                <div
                    onClick={onClose}
                    className="absolute inset-0 z-20 bg-stone-950/20 backdrop-blur-xs md:hidden"
                />
            )}

            <aside
                className={`absolute inset-y-0 left-0 z-30 flex h-full w-64 shrink-0 flex-col border-r border-primary transition-all duration-300 md:relative md:translate-x-0 ${PANEL_BG} ${
                    isOpen
                        ? 'translate-x-0 opacity-100'
                        : '-translate-x-full md:-ml-64 opacity-0 pointer-events-none'
                }`}
            >
                <div className="flex items-center justify-between px-3 pt-3 pb-1">
                    <span className="text-[13px] font-medium text-primary">Chats</span>
                    <div className="flex items-center gap-0.5 text-muted">
                        <button
                            onClick={onOpenSearchModal}
                            className="p-1.5 rounded-md hover:bg-light-3 hover:text-primary transition-colors"
                            title="Search"
                        >
                            <Search className="h-4 w-4" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-md hover:bg-light-3 hover:text-primary transition-colors"
                            title="Close history"
                        >
                            <PanelLeft className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="px-2 pb-2">
                    <button
                        onClick={() => {
                            onNewChat()
                            if (window.innerWidth < 1024) onClose()
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-secondary hover:bg-light-3 transition-colors"
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
                                isEditing={editingChatId === chat.id}
                                editTitle={editTitle}
                                onEditTitleChange={setEditTitle}
                                onSelect={() => {
                                    onSelectChat(chat.id)
                                    if (window.innerWidth < 1024) onClose()
                                }}
                                onStartRename={(e) => handleStartRename(e, chat)}
                                onSaveRename={(e) => handleSaveRename(e, chat.id)}
                                onCancelRename={(e) => {
                                    e.stopPropagation()
                                    setEditingChatId(null)
                                }}
                                onToggleStar={(e) => {
                                    e.stopPropagation()
                                    onToggleStarChat(chat.id)
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
    isEditing: boolean
    editTitle: string
    onEditTitleChange: (v: string) => void
    onSelect: () => void
    onStartRename: (e: React.MouseEvent) => void
    onSaveRename: (e: React.MouseEvent) => void
    onCancelRename: (e: React.MouseEvent) => void
    onToggleStar: (e: React.MouseEvent) => void
    onDelete: (e: React.MouseEvent) => void
}

const ChatItem: React.FC<ChatItemProps> = ({
    chat,
    isActive,
    isEditing,
    editTitle,
    onEditTitleChange,
    onSelect,
    onStartRename,
    onSaveRename,
    onCancelRename,
    onToggleStar,
    onDelete,
}) => {
    return (
        <div
            onClick={onSelect}
            className={`group relative flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] transition-colors ${
                isActive ? 'bg-light-3 text-primary font-medium' : 'text-secondary hover:bg-light-3'
            }`}
        >
            {isEditing ? (
                <div className="flex w-full items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => onEditTitleChange(e.target.value)}
                        className="w-full rounded border border-primary bg-white px-1.5 py-0.5 text-xs text-primary focus:outline-none"
                        autoFocus
                    />
                    <button onClick={onSaveRename} className="text-emerald-600">
                        <Check className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={onCancelRename} className="text-muted">
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            ) : (
                <>
                    <span className="truncate pr-10">{chat.title || 'New chat'}</span>
                    <div className="absolute right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-accent/90 rounded-md p-0.5">
                        <button onClick={onToggleStar} className="p-1 text-muted hover:text-amber-500" title="Star">
                            <Star className={`h-3 w-3 ${chat.starred ? 'fill-amber-500 text-amber-500' : ''}`} />
                        </button>
                        <button onClick={onStartRename} className="p-1 text-muted hover:text-primary" title="Rename">
                            <Edit2 className="h-3 w-3" />
                        </button>
                        <button onClick={onDelete} className="p-1 text-muted hover:text-rose-600" title="Delete">
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
