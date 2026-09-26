import React from 'react'
import { Chat } from '../types'
import { Plus, Trash2 } from 'lucide-react'
import { ByokSidebarPanel } from './ByokSidebarPanel'
import { useTokenQuota } from '../../../lib/chat-usage-client'
import { hasActiveByok } from '../../../lib/byok-vault'
import { useOptionalApp } from '../../../context/App'

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

const SidebarComponent: React.FC<SidebarProps> = ({
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

                <nav aria-label="Chat history" className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
                    {chats.length === 0 ? (
                        <div role="status" aria-live="polite" className="px-2 py-6 text-center text-xs text-muted">No chats yet</div>
                    ) : (
                        <ul className="space-y-0.5">
                            {chats.map((chat) => (
                                <li key={chat.id}>
                                    <ChatItem
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
                                </li>
                            ))}
                        </ul>
                    )}
                </nav>

                {/* Token Quota Meter */}
                <SidebarUsageMeter />

                {/* BYOK Custom Keys Panel */}
                <ByokSidebarPanel />
            </aside>
        </>
    )
}

/**
 * Stream token flushes rewrite `chats` (new array + message refs) every rAF.
 * Sidebar UI only depends on open/active + each row's id/title — ignore handler
 * identity (parent often passes inline arrows) so history stays quiet mid-stream.
 */
export const Sidebar = React.memo(SidebarComponent, (prev, next) => {
    if (prev.isOpen !== next.isOpen || prev.activeChatId !== next.activeChatId) return false
    if (prev.chats.length !== next.chats.length) return false
    for (let i = 0; i < prev.chats.length; i++) {
        const a = prev.chats[i]
        const b = next.chats[i]
        if (a.id !== b.id || a.title !== b.title) return false
    }
    return true
})

const SidebarUsageMeter: React.FC = () => {
    const { quota } = useTokenQuota()
    const app = useOptionalApp()
    const [byokActive, setByokActive] = React.useState(false)

    React.useEffect(() => {
        setByokActive(hasActiveByok())
        const handleByok = () => setByokActive(hasActiveByok())
        window.addEventListener('wim_byok_updated', handleByok)
        return () => window.removeEventListener('wim_byok_updated', handleByok)
    }, [])

    if (byokActive) {
        return (
            <div className="px-3 py-1.5 flex items-center justify-between text-[11.5px] text-muted">
                <span>Usage</span>
                <span className="text-[11px] font-medium text-primary">BYOK (your keys)</span>
            </div>
        )
    }

    if (!quota) {
        return (
            <div className="px-3 py-1.5 text-[11.5px] text-muted">
                <span>Usage</span>
            </div>
        )
    }

    const remainingPercent = Math.max(0, Math.min(100, Math.round(100 - (quota.percentage || 0))))
    const planLabel =
        quota.tier === 'pro' ? 'pro' : quota.tier === 'guest' ? 'guest' : quota.tier === 'dev' ? 'dev' : 'free'
    const resetAt = new Date(quota.resetAtUtc)
    const resetLabel = Number.isNaN(resetAt.getTime())
        ? ''
        : resetAt.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }).toLowerCase()
    const blocked = quota.allowed === false && !quota.unavailable

    return (
        <div className="px-3 py-1.5 space-y-1">
            <div className="flex items-center justify-between text-[11.5px] text-secondary">
                <span>Usage</span>
                <span className="font-mono text-[11px] font-medium text-primary">
                    {quota.unavailable ? 'unavailable' : `${remainingPercent}% · weekly · ${planLabel}`}
                </span>
            </div>
            {!quota.unavailable ? (
                <div className="h-1 w-full rounded-full bg-primary/10 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-300 ${
                            remainingPercent <= 10
                                ? 'bg-rose-500'
                                : remainingPercent <= 25
                                  ? 'bg-amber-500'
                                  : 'bg-primary/50'
                        }`}
                        style={{ width: `${remainingPercent}%` }}
                    />
                </div>
            ) : null}
            {blocked ? (
                <p className="m-0 text-[11px] leading-4 text-muted">
                    {quota.tier === 'pro' || quota.tier === 'dev' ? (
                        <>Weekly limit reached{resetLabel ? `. Resets ${resetLabel}` : ''}.</>
                    ) : (
                        <>
                            Weekly limit reached.{' '}
                            <button
                                type="button"
                                onClick={() => app?.addWindow?.({ path: '/pricing' })}
                                className="underline hover:text-primary transition-colors cursor-pointer"
                            >
                                Study
                            </button>
                        </>
                    )}
                </p>
            ) : null}
        </div>
    )
}

interface ChatItemProps {
    chat: Chat
    isActive: boolean
    onSelect: () => void
    onDelete: (e: React.MouseEvent) => void
}

const ChatItemComponent: React.FC<ChatItemProps> = ({
    chat,
    isActive,
    onSelect,
    onDelete,
}) => {
    return (
        <div
            className={`group relative flex items-center justify-between rounded-md text-[13px] font-sans transition-all duration-150 ${
                isActive
                    ? 'bg-accent border border-primary/40 text-primary font-semibold shadow-2xs'
                    : 'text-secondary border border-transparent hover:bg-accent/70 hover:text-primary'
            }`}
        >
            <button
                type="button"
                onClick={onSelect}
                aria-current={isActive ? 'page' : undefined}
                className="flex-1 truncate text-left px-2.5 py-1.5 cursor-pointer outline-none rounded-md focus-visible:ring-2 focus-visible:ring-primary/50"
            >
                <span className="truncate pr-7 block w-full">{chat.title || 'New chat'}</span>
            </button>
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

// Stream paints replace `chats` every rAF; ChatItem only paints id/title/active.
const ChatItem = React.memo(ChatItemComponent, (prev, next) => {
    return (
        prev.isActive === next.isActive &&
        prev.chat.id === next.chat.id &&
        prev.chat.title === next.chat.title
    )
})
