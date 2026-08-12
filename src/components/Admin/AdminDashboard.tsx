import React, { useEffect, useState, useMemo } from 'react'
import { useUser } from 'hooks/useUser'
import { supabase } from 'lib/supabase'
import SEO from 'components/seo'
import OSButton from 'components/OSButton'
import OSTabs from 'components/OSTabs'
import { Fieldset } from 'components/OSFieldset'
import OSInput from 'components/OSForm/input'
import { useToast } from 'context/Toast'
import {
    IconSparkles,
    IconUser,
    IconBook,
    IconMessage,
    IconCheck,
    IconX,
    IconRefresh,
    IconShield,
    IconActivity,
    IconTrash,
} from '@posthog/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

interface SystemStats {
    totalUsers: number
    totalPosts: number
    totalNotebooks: number
    totalBots: number
    totalMessages: number
    totalDebates: number
}

interface UserRow {
    id: string
    username: string | null
    role: string | null
    created_at: string | null
    avatar_url: string | null
    bio: string | null
    email?: string | null
}

interface PostRow {
    id: number | string
    title: string
    content: string
    created_at: string
    username?: string
    is_pinned?: boolean
    is_locked?: boolean
}

interface NotebookRow {
    id: string
    short_id: string
    title: string
    content: string
    updated_at: string
    is_published: boolean
    is_template: boolean
    owner_key: string
}

interface ContactMessageRow {
    id: number | string
    name?: string
    email?: string
    message: string
    created_at: string
    is_read?: boolean
}

interface WriterAppRow {
    id: string | number
    user_id: string
    username: string
    reason: string
    status: 'pending' | 'approved' | 'rejected'
    created_at: string
}

interface AgentLog {
    id: string | number
    agent_name: string
    action: string
    details: string
    timestamp: string
}

const INITIAL_PHILOSOPHER_BOTS = [
    { id: 'nietzsche', name: 'Nietzsche', era: '19th Century', stance: 'Will to Power & Existential Affirmation', avatar: '⚡', prompt: 'You are Friedrich Nietzsche. Speak with profound philosophical passion, challenging weak assumptions.' },
    { id: 'marx', name: 'Marx', era: '19th Century', stance: 'Historical Materialism & Class Critique', avatar: '🛠️', prompt: 'You are Karl Marx. Analyze socio-economic conditions, material realities, and systemic structures.' },
    { id: 'kant', name: 'Kant', era: '18th Century', stance: 'Categorical Imperative & Enlightenment Duty', avatar: '🏛️', prompt: 'You are Immanuel Kant. Systematically evaluate duty, moral law, and rational limits.' },
    { id: 'confucius', name: 'Confucius', era: 'Ancient China', stance: 'Ren, Ritual Propriety & Harmony', avatar: '☯️', prompt: 'You are Confucius (Kong Fuzi). Emphasize virtue, familial devotion, and social harmony.' },
    { id: 'socrates', name: 'Socrates', era: 'Ancient Greece', stance: 'Socratic Dialogue & Unexamined Life', avatar: '🦉', prompt: 'You are Socrates. Question assumptions ruthlessly using dialectic inquiry.' },
]

export default function AdminDashboard() {
    const { user, isModerator } = useUser()
    const { addToast } = useToast()
    const [activeTab, setActiveTab] = useState<string>('overview')

    const [stats, setStats] = useState<SystemStats>({
        totalUsers: 0,
        totalPosts: 0,
        totalNotebooks: 0,
        totalBots: INITIAL_PHILOSOPHER_BOTS.length,
        totalMessages: 0,
        totalDebates: 0,
    })
    const [statsLoading, setStatsLoading] = useState(true)

    // Data lists
    const [posts, setPosts] = useState<PostRow[]>([])
    const [postsSearch, setPostsSearch] = useState('')
    const [postsLoading, setPostsLoading] = useState(false)
    const [selectedPost, setSelectedPost] = useState<PostRow | null>(null)

    const [notebooks, setNotebooks] = useState<NotebookRow[]>([])
    const [notebooksSearch, setNotebooksSearch] = useState('')
    const [notebooksLoading, setNotebooksLoading] = useState(false)
    const [selectedNotebook, setSelectedNotebook] = useState<NotebookRow | null>(null)

    const [users, setUsers] = useState<UserRow[]>([])
    const [userSearch, setUserSearch] = useState('')
    const [userRoleFilter, setUserRoleFilter] = useState<string>('all')
    const [usersLoading, setUsersLoading] = useState(false)

    const [applications, setApplications] = useState<WriterAppRow[]>([])
    const [appsLoading, setAppsLoading] = useState(false)

    const [messages, setMessages] = useState<ContactMessageRow[]>([])
    const [messagesLoading, setMessagesLoading] = useState(false)
    const [selectedMessage, setSelectedMessage] = useState<ContactMessageRow | null>(null)

    const [logs, setLogs] = useState<AgentLog[]>([])
    const [logsLoading, setLogsLoading] = useState(false)

    const [cronTriggering, setCronTriggering] = useState(false)

    // Bot prompt test modal state
    const [testBot, setTestBot] = useState<any | null>(null)
    const [testQuestion, setTestQuestion] = useState('')
    const [testReply, setTestReply] = useState('')
    const [testLoading, setTestLoading] = useState(false)

    // Fetch initial Overview Stats
    const fetchOverviewStats = async () => {
        setStatsLoading(true)
        try {
            const [usersRes, postsRes, notebooksRes, messagesRes, debatesRes] = await Promise.all([
                supabase.from('profiles').select('id', { count: 'exact', head: true }),
                supabase.from('community_posts').select('id', { count: 'exact', head: true }),
                supabase.from('wim_notebooks').select('id', { count: 'exact', head: true }),
                supabase.from('contact_messages').select('id', { count: 'exact', head: true }),
                supabase.from('debates').select('id', { count: 'exact', head: true }),
            ])
            setStats({
                totalUsers: usersRes.count || 0,
                totalPosts: postsRes.count || 0,
                totalNotebooks: notebooksRes.count || 0,
                totalBots: INITIAL_PHILOSOPHER_BOTS.length,
                totalMessages: messagesRes.count || 0,
                totalDebates: debatesRes.count || 0,
            })
        } catch (e) {
            console.error('[AdminDashboard] Stats error', e)
        } finally {
            setStatsLoading(false)
        }
    }

    // Fetch Posts
    const fetchPosts = async () => {
        setPostsLoading(true)
        try {
            const { data } = await supabase.from('community_posts').select('*').order('created_at', { ascending: false }).limit(60)
            setPosts((data || []) as PostRow[])
        } catch {
            setPosts([])
        } finally {
            setPostsLoading(false)
        }
    }

    // Fetch Notebooks
    const fetchNotebooks = async () => {
        setNotebooksLoading(true)
        try {
            const { data } = await supabase.from('wim_notebooks').select('*').order('updated_at', { ascending: false }).limit(60)
            setNotebooks((data || []) as NotebookRow[])
        } catch {
            setNotebooks([])
        } finally {
            setNotebooksLoading(false)
        }
    }

    // Fetch Users List
    const fetchUsers = async () => {
        setUsersLoading(true)
        try {
            const { data } = await supabase.from('profiles').select('id, username, role, created_at, avatar_url, bio').order('created_at', { ascending: false }).limit(100)
            setUsers((data || []) as UserRow[])
        } catch {
            setUsers([])
        } finally {
            setUsersLoading(false)
        }
    }

    // Fetch Applications
    const fetchApplications = async () => {
        setAppsLoading(true)
        try {
            const { data } = await supabase.from('writer_applications').select('*').order('created_at', { ascending: false }).limit(40)
            setApplications((data || []) as WriterAppRow[])
        } catch {
            setApplications([])
        } finally {
            setAppsLoading(false)
        }
    }

    // Fetch Messages
    const fetchMessages = async () => {
        setMessagesLoading(true)
        try {
            const { data } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(40)
            setMessages((data || []) as ContactMessageRow[])
        } catch {
            setMessages([])
        } finally {
            setMessagesLoading(false)
        }
    }

    // Fetch Audit Logs
    const fetchLogs = async () => {
        setLogsLoading(true)
        try {
            const { data } = await supabase.from('agent_action_log').select('*').order('timestamp', { ascending: false }).limit(50)
            setLogs((data || []) as AgentLog[])
        } catch {
            setLogs([])
        } finally {
            setLogsLoading(false)
        }
    }

    useEffect(() => {
        fetchOverviewStats()
    }, [])

    useEffect(() => {
        if (activeTab === 'posts') fetchPosts()
        if (activeTab === 'notebooks') fetchNotebooks()
        if (activeTab === 'users') fetchUsers()
        if (activeTab === 'applications') fetchApplications()
        if (activeTab === 'messages') fetchMessages()
        if (activeTab === 'logs') fetchLogs()
    }, [activeTab])

    // Role Handler
    const handleRoleUpdate = async (userId: string, newRole: string) => {
        try {
            const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
            if (error) throw error
            addToast({
                description: (
                    <>
                        <IconCheck className="text-green size-4 inline mr-1" />
                        Role updated to "{newRole}"
                    </>
                ),
                duration: 3000,
            })
            setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
        } catch (err: any) {
            addToast({ description: err.message || 'Failed to update role', error: true })
        }
    }

    // Post Handlers
    const handleDeletePost = async (postId: number | string) => {
        if (!confirm('Are you sure you want to delete this community post?')) return
        try {
            const { error } = await supabase.from('community_posts').delete().eq('id', postId)
            if (error) throw error
            addToast({ description: 'Post deleted successfully' })
            setPosts((prev) => prev.filter((p) => p.id !== postId))
            if (selectedPost?.id === postId) setSelectedPost(null)
        } catch (err: any) {
            addToast({ description: err.message || 'Failed to delete post', error: true })
        }
    }

    const handleTogglePinPost = async (postId: number | string, currentPinned?: boolean) => {
        try {
            const { error } = await supabase.from('community_posts').update({ is_pinned: !currentPinned }).eq('id', postId)
            if (error) throw error
            addToast({ description: !currentPinned ? 'Post pinned to top' : 'Post unpinned' })
            setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, is_pinned: !currentPinned } : p)))
        } catch (err: any) {
            addToast({ description: err.message || 'Failed to pin post', error: true })
        }
    }

    // Notebook Handlers
    const handleToggleTemplate = async (notebookId: string, currentVal: boolean) => {
        try {
            const { error } = await supabase.from('wim_notebooks').update({ is_template: !currentVal }).eq('id', notebookId)
            if (error) throw error
            addToast({ description: !currentVal ? 'Set as template' : 'Template flag removed' })
            setNotebooks((prev) => prev.map((n) => (n.id === notebookId ? { ...n, is_template: !currentVal } : n)))
        } catch (err: any) {
            addToast({ description: err.message || 'Failed to update notebook', error: true })
        }
    }

    const handleDeleteNotebook = async (notebookId: string) => {
        if (!confirm('Are you sure you want to delete this notebook?')) return
        try {
            const { error } = await supabase.from('wim_notebooks').delete().eq('id', notebookId)
            if (error) throw error
            addToast({ description: 'Notebook deleted successfully' })
            setNotebooks((prev) => prev.filter((n) => n.id !== notebookId))
            if (selectedNotebook?.id === notebookId) setSelectedNotebook(null)
        } catch (err: any) {
            addToast({ description: err.message || 'Failed to delete notebook', error: true })
        }
    }

    // Contact Message Handlers
    const handleDeleteMessage = async (messageId: number | string) => {
        if (!confirm('Are you sure you want to delete this contact message?')) return
        try {
            const { error } = await supabase.from('contact_messages').delete().eq('id', messageId)
            if (error) throw error
            addToast({ description: 'Message deleted' })
            setMessages((prev) => prev.filter((m) => m.id !== messageId))
            if (selectedMessage?.id === messageId) setSelectedMessage(null)
        } catch (err: any) {
            addToast({ description: err.message || 'Failed to delete message', error: true })
        }
    }

    // Cron Trigger Handler
    const handleTriggerCron = async () => {
        setCronTriggering(true)
        try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
            if (sessionError || !sessionData.session?.access_token) {
                throw new Error('Admin session required to trigger philosopher bots')
            }
            const res = await fetch('/api/admin/philosopher-bots', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${sessionData.session.access_token}`,
                },
            })
            const data = await res.json()
            if (res.ok && data.success) {
                addToast({
                    description: (
                        <>
                            <IconSparkles className="text-yellow size-4 inline mr-1" />
                            Philosopher Bot Cron Executed Successfully!
                        </>
                    ),
                    duration: 4000,
                })
                fetchOverviewStats()
            } else {
                addToast({ description: data.error || 'Cron execution failed', error: true })
            }
        } catch (err: any) {
            addToast({ description: err.message || 'Network error triggering cron', error: true })
        } finally {
            setCronTriggering(false)
        }
    }

    // Test Bot Handler
    const handleTestBot = async () => {
        if (!testQuestion.trim() || !testBot) return
        setTestLoading(true)
        setTestReply('')
        try {
            const res = await fetch('/api/philosopher-bot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    philosopher: testBot.name,
                    question: testQuestion,
                    mood: 'calm',
                }),
            })
            const data = await res.json()
            if (data.success && data.reply) {
                setTestReply(data.reply)
            } else {
                setTestReply(`Error: ${data.error || 'Bot failed to respond'}`)
            }
        } catch (err: any) {
            setTestReply(`Network Error: ${err.message}`)
        } finally {
            setTestLoading(false)
        }
    }

    // Filtered lists
    const filteredPosts = useMemo(() => {
        if (!postsSearch.trim()) return posts
        const q = postsSearch.toLowerCase()
        return posts.filter((p) => p.title.toLowerCase().includes(q) || p.username?.toLowerCase().includes(q) || String(p.content).toLowerCase().includes(q))
    }, [posts, postsSearch])

    const filteredNotebooks = useMemo(() => {
        if (!notebooksSearch.trim()) return notebooks
        const q = notebooksSearch.toLowerCase()
        return notebooks.filter((n) => n.title.toLowerCase().includes(q) || n.short_id.toLowerCase().includes(q))
    }, [notebooks, notebooksSearch])

    const filteredUsers = useMemo(() => {
        return users.filter((u) => {
            const matchesSearch = !userSearch.trim() || u.username?.toLowerCase().includes(userSearch.toLowerCase()) || u.id.includes(userSearch)
            const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter
            return matchesSearch && matchesRole
        })
    }, [users, userSearch, userRoleFilter])

    if (!user || !isModerator) {
        return (
            <div className="h-full bg-primary text-primary flex items-center justify-center p-8">
                <SEO title="Admin Dashboard - WorldInMaking" />
                <div className="max-w-md w-full text-center p-8 bg-accent border border-primary rounded-2xl shadow-2xl">
                    <IconShield className="w-12 h-12 mx-auto text-red mb-4 opacity-80" />
                    <h1 className="text-xl font-bold mb-2">Access Restricted</h1>
                    <p className="text-sm text-secondary mb-6">
                        You need Moderator or Administrator permissions to access the WorldInMaking Admin OS Panel.
                    </p>
                </div>
            </div>
        )
    }

    const tabConfig = [
        { value: 'overview', label: 'Overview', content: null },
        { value: 'posts', label: 'Posts & Forum', content: null },
        { value: 'notebooks', label: 'Notebooks', content: null },
        { value: 'bots', label: 'Philosopher Bots', content: null },
        { value: 'users', label: 'Users', content: null },
        { value: 'applications', label: 'Applications', content: null },
        { value: 'messages', label: 'Messages', content: null },
        { value: 'logs', label: 'Audit Logs', content: null },
    ]

    return (
        <div data-scheme="primary" className="h-full bg-primary text-primary flex flex-col overflow-hidden select-none">
            <SEO title="Enterprise Admin OS Dashboard - WorldInMaking" />

            {/* Header */}
            <div className="p-4 border-b border-primary bg-accent/40 backdrop-blur-md flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red/10 dark:bg-yellow/10 border border-red/20 dark:border-yellow/20 flex items-center justify-center text-red dark:text-yellow">
                        <IconShield className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold m-0 leading-tight">WorldInMaking Enterprise Admin OS</h1>
                        <p className="text-xs text-secondary m-0">Full System Moderation, Bots, Notebooks & Content Oversight</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <OSButton variant="secondary" size="sm" onClick={handleTriggerCron} disabled={cronTriggering}>
                        <IconSparkles className={`w-4 h-4 mr-1.5 ${cronTriggering ? 'animate-spin' : ''}`} />
                        {cronTriggering ? 'Running Cron...' : 'Run Bot Cron'}
                    </OSButton>
                    <OSButton variant="secondary" size="sm" onClick={fetchOverviewStats}>
                        <IconRefresh className="w-4 h-4" />
                    </OSButton>
                </div>
            </div>

            {/* OSTabs Bar */}
            <div className="px-4 pt-2 border-b border-primary bg-accent/20 overflow-x-auto">
                <OSTabs
                    tabs={tabConfig}
                    value={activeTab}
                    onValueChange={(val) => setActiveTab(val)}
                />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                            <div className="bg-accent/60 border border-primary p-4 rounded-2xl shadow-sm">
                                <div className="flex items-center justify-between text-secondary mb-1 text-xs font-semibold">
                                    <span>MEMBERS</span>
                                    <IconUser className="w-4 h-4 text-red dark:text-yellow" />
                                </div>
                                <div className="text-2xl font-extrabold">{statsLoading ? '...' : stats.totalUsers}</div>
                            </div>

                            <div className="bg-accent/60 border border-primary p-4 rounded-2xl shadow-sm">
                                <div className="flex items-center justify-between text-secondary mb-1 text-xs font-semibold">
                                    <span>BOTS</span>
                                    <IconSparkles className="w-4 h-4 text-yellow" />
                                </div>
                                <div className="text-2xl font-extrabold">{stats.totalBots}</div>
                            </div>

                            <div className="bg-accent/60 border border-primary p-4 rounded-2xl shadow-sm">
                                <div className="flex items-center justify-between text-secondary mb-1 text-xs font-semibold">
                                    <span>NOTEBOOKS</span>
                                    <IconBook className="w-4 h-4 text-green" />
                                </div>
                                <div className="text-2xl font-extrabold">{statsLoading ? '...' : stats.totalNotebooks}</div>
                            </div>

                            <div className="bg-accent/60 border border-primary p-4 rounded-2xl shadow-sm">
                                <div className="flex items-center justify-between text-secondary mb-1 text-xs font-semibold">
                                    <span>COMMUNITY POSTS</span>
                                    <IconMessage className="w-4 h-4 text-blue-500" />
                                </div>
                                <div className="text-2xl font-extrabold">{statsLoading ? '...' : stats.totalPosts}</div>
                            </div>

                            <div className="bg-accent/60 border border-primary p-4 rounded-2xl shadow-sm">
                                <div className="flex items-center justify-between text-secondary mb-1 text-xs font-semibold">
                                    <span>MESSAGES</span>
                                    <IconMessage className="w-4 h-4 text-purple-400" />
                                </div>
                                <div className="text-2xl font-extrabold">{statsLoading ? '...' : stats.totalMessages}</div>
                            </div>

                            <div className="bg-accent/60 border border-primary p-4 rounded-2xl shadow-sm">
                                <div className="flex items-center justify-between text-secondary mb-1 text-xs font-semibold">
                                    <span>BOT DEBATES</span>
                                    <IconActivity className="w-4 h-4 text-orange-400" />
                                </div>
                                <div className="text-2xl font-extrabold">{statsLoading ? '...' : stats.totalDebates}</div>
                            </div>
                        </div>

                        {/* System Health */}
                        <Fieldset legend="Infrastructure & Cloud Health">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                                <div className="p-3 bg-primary rounded-xl border border-primary flex justify-between items-center">
                                    <span className="font-semibold text-secondary">PostgreSQL Storage</span>
                                    <span className="text-green font-bold flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-green animate-pulse" /> Supabase Managed
                                    </span>
                                </div>
                                <div className="p-3 bg-primary rounded-xl border border-primary flex justify-between items-center">
                                    <span className="font-semibold text-secondary">Auth Identity Service</span>
                                    <span className="text-green font-bold">Supabase GoTrue (PKCE Enabled)</span>
                                </div>
                                <div className="p-3 bg-primary rounded-xl border border-primary flex justify-between items-center">
                                    <span className="font-semibold text-secondary">Edge Cron Engine</span>
                                    <span className="text-blue-500 font-bold">GitHub Actions Hourly Workflow</span>
                                </div>
                            </div>
                        </Fieldset>
                    </div>
                )}

                {/* POSTS MODERATION TAB */}
                {activeTab === 'posts' && (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold">Community & Forum Moderation</h2>
                                <p className="text-xs text-secondary">Inspect essays, filter, pin topics, or delete inappropriate content.</p>
                            </div>
                            <div className="w-full sm:w-72">
                                <OSInput
                                    label=""
                                    placeholder="Search posts by title or author..."
                                    value={postsSearch}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPostsSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        {postsLoading ? (
                            <div className="p-8 text-center text-xs text-secondary animate-pulse">Loading posts...</div>
                        ) : filteredPosts.length === 0 ? (
                            <div className="p-8 text-center bg-accent/40 border border-primary rounded-2xl text-xs text-secondary">
                                No matching community posts found in database.
                            </div>
                        ) : (
                            <div className="bg-accent/40 border border-primary rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-accent/80 border-b border-primary font-bold text-secondary">
                                            <th className="p-3">Title</th>
                                            <th className="p-3">Author</th>
                                            <th className="p-3">Pinned</th>
                                            <th className="p-3">Date</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-primary">
                                        {filteredPosts.map((p) => (
                                            <tr key={p.id} className="hover:bg-accent/30 transition-colors">
                                                <td className="p-3 font-semibold text-primary max-w-xs truncate cursor-pointer hover:underline" onClick={() => setSelectedPost(p)}>
                                                    {p.title}
                                                </td>
                                                <td className="p-3 text-secondary">{p.username || 'Author'}</td>
                                                <td className="p-3">
                                                    {p.is_pinned ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow/10 text-yellow border border-yellow/20">PINNED</span>
                                                    ) : (
                                                        <span className="text-muted text-[11px]">-</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-muted">{dayjs(p.created_at).fromNow()}</td>
                                                <td className="p-3 text-right space-x-1">
                                                    <button
                                                        onClick={() => handleTogglePinPost(p.id, p.is_pinned)}
                                                        className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${p.is_pinned ? 'bg-yellow/20 text-yellow' : 'bg-primary hover:bg-accent text-secondary'}`}
                                                    >
                                                        {p.is_pinned ? 'Unpin' : 'Pin'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePost(p.id)}
                                                        className="px-2 py-1 bg-red/10 hover:bg-red/20 text-red rounded-md text-[11px] font-semibold transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Selected Post Detail Modal */}
                        {selectedPost && (
                            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                                <div className="bg-primary border border-primary rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col shadow-2xl">
                                    <div className="flex items-center justify-between border-b border-primary pb-3">
                                        <h3 className="text-lg font-bold m-0">{selectedPost.title}</h3>
                                        <button onClick={() => setSelectedPost(null)} className="p-1 hover:bg-accent rounded-lg text-secondary">
                                            <IconX className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto text-xs text-secondary leading-relaxed bg-accent/40 p-4 rounded-xl border border-primary whitespace-pre-wrap">
                                        {selectedPost.content}
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-primary text-xs">
                                        <span className="text-muted">Author: {selectedPost.username || 'Unknown'}</span>
                                        <div className="space-x-2">
                                            <OSButton variant="secondary" size="sm" onClick={() => setSelectedPost(null)}>Close</OSButton>
                                            <button onClick={() => handleDeletePost(selectedPost.id)} className="px-3 py-1.5 bg-red text-white font-bold rounded-lg hover:bg-red/80 transition-colors">
                                                Delete Post
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* NOTEBOOKS TAB */}
                {activeTab === 'notebooks' && (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold">SaaS Notebooks Oversight</h2>
                                <p className="text-xs text-secondary">Inspect documents created across the workspace and flag official templates.</p>
                            </div>
                            <div className="w-full sm:w-72">
                                <OSInput
                                    label=""
                                    placeholder="Search notebooks by title or ID..."
                                    value={notebooksSearch}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotebooksSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        {notebooksLoading ? (
                            <div className="p-8 text-center text-xs text-secondary animate-pulse">Loading notebooks...</div>
                        ) : filteredNotebooks.length === 0 ? (
                            <div className="p-8 text-center bg-accent/40 border border-primary rounded-2xl text-xs text-secondary">
                                No matching notebooks found in database.
                            </div>
                        ) : (
                            <div className="bg-accent/40 border border-primary rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-accent/80 border-b border-primary font-bold text-secondary">
                                            <th className="p-3">Title</th>
                                            <th className="p-3">Short ID</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3">Last Modified</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-primary">
                                        {filteredNotebooks.map((nb) => (
                                            <tr key={nb.id} className="hover:bg-accent/30 transition-colors">
                                                <td className="p-3 font-semibold text-primary cursor-pointer hover:underline" onClick={() => setSelectedNotebook(nb)}>
                                                    {nb.title || 'Untitled Notebook'}
                                                </td>
                                                <td className="p-3 font-mono text-muted">{nb.short_id}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${nb.is_published ? 'bg-green/10 text-green border border-green/20' : 'bg-primary text-secondary'}`}>
                                                        {nb.is_published ? 'PUBLIC' : 'PRIVATE'}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-muted">{dayjs(nb.updated_at).fromNow()}</td>
                                                <td className="p-3 text-right space-x-1">
                                                    <button
                                                        onClick={() => handleToggleTemplate(nb.id, nb.is_template)}
                                                        className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${nb.is_template ? 'bg-yellow/20 text-yellow' : 'bg-primary hover:bg-accent text-secondary'}`}
                                                    >
                                                        {nb.is_template ? 'Remove Template' : 'Make Template'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteNotebook(nb.id)}
                                                        className="px-2 py-1 bg-red/10 hover:bg-red/20 text-red rounded-md text-[11px] font-semibold transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Selected Notebook Modal */}
                        {selectedNotebook && (
                            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                                <div className="bg-primary border border-primary rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col shadow-2xl">
                                    <div className="flex items-center justify-between border-b border-primary pb-3">
                                        <h3 className="text-lg font-bold m-0">{selectedNotebook.title}</h3>
                                        <button onClick={() => setSelectedNotebook(null)} className="p-1 hover:bg-accent rounded-lg text-secondary">
                                            <IconX className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto text-xs text-secondary leading-relaxed bg-accent/40 p-4 rounded-xl border border-primary whitespace-pre-wrap font-mono">
                                        {selectedNotebook.content || '(Empty notebook document)'}
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-primary text-xs">
                                        <span className="text-muted">Short ID: {selectedNotebook.short_id}</span>
                                        <OSButton variant="secondary" size="sm" onClick={() => setSelectedNotebook(null)}>Close</OSButton>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* BOT MANAGEMENT TAB */}
                {activeTab === 'bots' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold">Philosopher Bot Fleet</h2>
                                <p className="text-xs text-secondary">Manage autonomous AI personas, test prompts live, and trigger cron cycles.</p>
                            </div>
                            <OSButton variant="primary" size="sm" onClick={handleTriggerCron} disabled={cronTriggering}>
                                <IconSparkles className="w-4 h-4 mr-1.5" />
                                Run Hourly Bot Cycle
                            </OSButton>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {INITIAL_PHILOSOPHER_BOTS.map((bot) => (
                                <div key={bot.name} className="p-5 bg-accent/60 border border-primary rounded-2xl shadow-sm hover:border-accent transition-all flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-2xl">{bot.avatar}</span>
                                                <div>
                                                    <h3 className="text-base font-bold m-0">{bot.name}</h3>
                                                    <span className="text-xs text-muted">{bot.era}</span>
                                                </div>
                                            </div>
                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green/10 text-green border border-green/20">
                                                ACTIVE
                                            </span>
                                        </div>
                                        <p className="text-xs text-secondary leading-relaxed bg-primary p-3 rounded-xl border border-primary mb-3">
                                            "{bot.stance}"
                                        </p>
                                        <div className="text-[11px] font-mono text-muted bg-accent p-2.5 rounded-lg border border-primary">
                                            <span className="text-yellow font-bold">Prompt:</span> {bot.prompt}
                                        </div>
                                    </div>
                                    <div className="pt-3 mt-3 border-t border-primary flex items-center justify-between text-xs">
                                        <span className="text-muted">Status: Autonomous</span>
                                        <button
                                            onClick={() => { setTestBot(bot); setTestQuestion(''); setTestReply(''); }}
                                            className="px-2 py-1 bg-yellow/10 hover:bg-yellow/20 text-yellow font-bold rounded-md text-[11px] transition-colors"
                                        >
                                            Test Prompt Live
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Test Bot Modal */}
                        {testBot && (
                            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                                <div className="bg-primary border border-primary rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                                    <div className="flex items-center justify-between border-b border-primary pb-3">
                                        <h3 className="text-base font-bold m-0 flex items-center gap-2">
                                            <span>{testBot.avatar}</span> Test Prompt: {testBot.name}
                                        </h3>
                                        <button onClick={() => setTestBot(null)} className="p-1 hover:bg-accent rounded-lg text-secondary">
                                            <IconX className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-secondary">Ask {testBot.name} a question:</label>
                                        <OSInput
                                            label=""
                                            placeholder="What is the nature of power and ethics?"
                                            value={testQuestion}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestQuestion(e.target.value)}
                                        />
                                        <OSButton variant="primary" size="sm" width="full" onClick={handleTestBot} disabled={testLoading || !testQuestion.trim()}>
                                            {testLoading ? 'Philosopher Thinking...' : 'Submit Question'}
                                        </OSButton>
                                    </div>

                                    {testReply && (
                                        <div className="p-4 bg-accent rounded-xl border border-primary text-xs leading-relaxed text-secondary max-h-48 overflow-y-auto">
                                            <div className="font-bold text-yellow mb-1">{testBot.name}'s Reply:</div>
                                            {testReply}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* USER DIRECTORY TAB */}
                {activeTab === 'users' && (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold">User Directory & Roles</h2>
                                <p className="text-xs text-secondary">Search registered members and modify permissions (Admin, Moderator, Member).</p>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <select
                                    value={userRoleFilter}
                                    onChange={(e) => setUserRoleFilter(e.target.value)}
                                    className="bg-accent border border-primary rounded-xl px-3 py-2 text-xs font-semibold text-primary outline-none"
                                >
                                    <option value="all">All Roles</option>
                                    <option value="admin">Admin / Staff</option>
                                    <option value="moderator">Moderator</option>
                                    <option value="writer">Writer</option>
                                    <option value="member">Member</option>
                                </select>
                                <div className="w-64">
                                    <OSInput
                                        label=""
                                        placeholder="Search user..."
                                        value={userSearch}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {usersLoading ? (
                            <div className="p-8 text-center text-xs text-secondary animate-pulse">Loading directory...</div>
                        ) : (
                            <div className="bg-accent/40 border border-primary rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-accent/80 border-b border-primary font-bold text-secondary">
                                            <th className="p-3">User</th>
                                            <th className="p-3">Role</th>
                                            <th className="p-3">Joined</th>
                                            <th className="p-3 text-right">Set Role</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-primary">
                                        {filteredUsers.map((u) => (
                                            <tr key={u.id} className="hover:bg-accent/30 transition-colors">
                                                <td className="p-3 font-semibold">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center font-bold border border-primary text-xs">
                                                            {(u.username || 'U').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-primary">{u.username || 'Anonymous User'}</div>
                                                            <div className="text-[10px] text-muted font-mono">{u.id.slice(0, 18)}...</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        u.role === 'admin' || u.role === 'staff'
                                                            ? 'bg-red/10 text-red border border-red/20'
                                                            : u.role === 'moderator'
                                                            ? 'bg-yellow/10 text-yellow border border-yellow/20'
                                                            : u.role === 'writer'
                                                            ? 'bg-green/10 text-green border border-green/20'
                                                            : 'bg-primary text-secondary border border-primary'
                                                    }`}>
                                                        {u.role || 'member'}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-muted">
                                                    {u.created_at ? dayjs(u.created_at).fromNow() : 'Unknown'}
                                                </td>
                                                <td className="p-3 text-right space-x-1">
                                                    <button
                                                        onClick={() => handleRoleUpdate(u.id, 'moderator')}
                                                        className="px-2 py-1 bg-yellow/10 hover:bg-yellow/20 text-yellow rounded-md text-[11px] font-semibold transition-colors"
                                                    >
                                                        Mod
                                                    </button>
                                                    <button
                                                        onClick={() => handleRoleUpdate(u.id, 'writer')}
                                                        className="px-2 py-1 bg-green/10 hover:bg-green/20 text-green rounded-md text-[11px] font-semibold transition-colors"
                                                    >
                                                        Writer
                                                    </button>
                                                    <button
                                                        onClick={() => handleRoleUpdate(u.id, 'member')}
                                                        className="px-2 py-1 bg-primary hover:bg-accent text-secondary rounded-md text-[11px] font-semibold transition-colors"
                                                    >
                                                        Member
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* APPLICATIONS TAB */}
                {activeTab === 'applications' && (
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-lg font-bold">Writer & Community Applications</h2>
                            <p className="text-xs text-secondary">Review pending membership and author submissions.</p>
                        </div>

                        {appsLoading ? (
                            <div className="p-8 text-center text-xs text-secondary animate-pulse">Loading applications...</div>
                        ) : applications.length === 0 ? (
                            <div className="p-8 text-center bg-accent/40 border border-primary rounded-2xl text-xs text-secondary">
                                No pending writer applications found in database.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {applications.map((app) => (
                                    <div key={app.id} className="p-4 bg-accent/60 border border-primary rounded-2xl flex items-center justify-between gap-4">
                                        <div>
                                            <div className="font-bold text-sm">{app.username}</div>
                                            <p className="text-xs text-secondary mt-1">{app.reason}</p>
                                            <div className="text-[10px] text-muted mt-2">{dayjs(app.created_at).fromNow()}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <OSButton variant="primary" size="sm" onClick={() => handleRoleUpdate(app.user_id, 'writer')}>
                                                Approve Writer Role
                                            </OSButton>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* CONTACT MESSAGES TAB */}
                {activeTab === 'messages' && (
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-lg font-bold">Contact Messages & Support Inbox</h2>
                            <p className="text-xs text-secondary">Read submissions sent via contact & support forms.</p>
                        </div>

                        {messagesLoading ? (
                            <div className="p-8 text-center text-xs text-secondary animate-pulse">Loading messages...</div>
                        ) : messages.length === 0 ? (
                            <div className="p-8 text-center bg-accent/40 border border-primary rounded-2xl text-xs text-secondary">
                                No contact messages in inbox.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {messages.map((m) => (
                                    <div key={m.id} className="p-4 bg-accent/60 border border-primary rounded-2xl space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-primary">{m.name || 'Anonymous'} ({m.email || 'No email'})</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-muted">{dayjs(m.created_at).fromNow()}</span>
                                                <button onClick={() => handleDeleteMessage(m.id)} className="p-1 hover:bg-red/10 text-red rounded-md">
                                                    <IconTrash className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-secondary leading-relaxed bg-primary p-3 rounded-xl border border-primary m-0">
                                            {m.message}
                                        </p>
                                        {m.email && (
                                            <a href={`mailto:${m.email}`} className="inline-block text-xs font-bold text-yellow hover:underline">
                                                Reply via Email &rarr;
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* AUDIT LOGS TAB */}
                {activeTab === 'logs' && (
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-lg font-bold">System & Agent Action Logs</h2>
                            <p className="text-xs text-secondary">Real-time action audit trail for autonomous agent cycles.</p>
                        </div>

                        {logsLoading ? (
                            <div className="p-8 text-center text-xs text-secondary animate-pulse">Loading audit logs...</div>
                        ) : logs.length === 0 ? (
                            <div className="p-8 text-center bg-accent/40 border border-primary rounded-2xl text-xs text-secondary font-mono">
                                System log stream active. No critical agent alerts logged.
                            </div>
                        ) : (
                            <div className="bg-accent/40 border border-primary rounded-2xl p-4 font-mono text-xs space-y-2">
                                {logs.map((log) => (
                                    <div key={log.id} className="p-2.5 bg-primary border border-primary rounded-xl flex items-start justify-between gap-4">
                                        <div>
                                            <span className="font-bold text-yellow mr-2">[{log.agent_name}]</span>
                                            <span className="text-primary">{log.action}</span>
                                            <div className="text-[11px] text-muted mt-0.5">{log.details}</div>
                                        </div>
                                        <span className="text-[10px] text-muted whitespace-nowrap">{dayjs(log.timestamp).fromNow()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    )
}
