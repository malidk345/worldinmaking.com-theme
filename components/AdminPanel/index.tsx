"use client"

import React, { useState, useEffect } from 'react'
import { IconNewspaper, IconUser, IconActivity, IconTerminal } from '@posthog/icons'
import OSButton from 'components/OSButton'
import { Edit, Save, Settings, Trash2, Plus, ArrowLeft } from 'lucide-react'
import RichTextEditor from './RichTextEditor'
import { useAdminData } from '../../hooks/useAdminData'
import { useAuth } from '../../context/AuthContext'
import { toSlug } from '../../utils/security'
import dayjs from 'dayjs'
import { useApp } from 'context/App'

const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'users' | 'settings'>('overview')
    const [isCreating, setIsCreating] = useState(false)
    const [editingPost, setEditingPost] = useState<any>(null)
    const [newPostTitle, setNewPostTitle] = useState('')
    const [newPostContent, setNewPostContent] = useState('')
    const [newPostExcerpt, setNewPostExcerpt] = useState('')

    const { user, profile, isAdmin } = useAuth()
    const { posts, fetchPosts, createPost, updatePost, deletePost, loading } = useAdminData()

    // Admin access control handled by useAuth isAdmin (profile.role === 'admin')

    if (!isAdmin) {
        return (
            <div className="p-6 text-center">
                <p className="text-red-500 font-semibold">Access Denied</p>
                <p className="text-gray-600 text-sm mt-2">You do not have permission to access the admin panel.</p>
            </div>
        )
    }

    useEffect(() => {
        if (activeTab === 'content') {
            fetchPosts()
        }
    }, [activeTab, fetchPosts])

    // useApp() can be undefined if accessed outside of provider, adding fallback just in case
    const app = useApp()
    const isMobile = app?.isMobile || false

    const TABS = [
        { id: 'overview', label: 'Overview', icon: IconActivity },
        { id: 'content', label: 'Content', icon: IconNewspaper },
        { id: 'users', label: 'Users', icon: IconUser },
        { id: 'settings', label: 'Settings', icon: Settings },
    ]

    const handleSavePost = async () => {
        if (!newPostTitle || !newPostContent) {
            alert('Please provide title and content')
            return
        }

        const postData = {
            title: newPostTitle,
            content: newPostContent,
            slug: toSlug(newPostTitle),
            author: profile?.username || user?.email?.split('@')[0] || 'Unknown',
            author_avatar: profile?.avatar_url || '',
            published: true,
            excerpt: newPostExcerpt || newPostContent.slice(0, 150) + '...'
        }

        let success;
        if (editingPost && !editingPost.isLocal) {
            success = await updatePost(editingPost.id, postData)
        } else {
            success = await createPost(postData)
        }

        if (success) {
            setIsCreating(false)
            setEditingPost(null)
            setNewPostTitle('')
            setNewPostContent('')
            setNewPostExcerpt('')
            fetchPosts()
        }
    }

    const handleEditClick = (post: any) => {
        setEditingPost(post)
        setNewPostTitle(post.title)
        setNewPostContent(post.content)
        setNewPostExcerpt(post.excerpt || '')
        setIsCreating(true)
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 text-primary">
                        <StatCard title="Total Views" value="12,450" change="+12%" />
                        <StatCard title="Active Users" value="845" change="+5%" />
                        <StatCard title="New Posts" value="24" change="+2" />
                        <StatCard title="Avg. Read Time" value="4m 12s" change="-1%" />

                        <div className="col-span-full mt-4 p-4 border border-primary rounded bg-accent/5">
                            <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                                <IconTerminal className="size-4" /> system status
                            </h3>
                            <div className="space-y-2 text-xs font-mono">
                                <div className="flex justify-between">
                                    <span className="text-muted">database:</span>
                                    <span className="text-green-500">connected</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted">build status:</span>
                                    <span className="text-green-500">passing</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted">last deploy:</span>
                                    <span>2 mins ago</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            case 'content':
                if (isCreating) {
                    return (
                        <div className="p-4 h-full flex flex-col text-primary">
                            <div className="flex justify-between items-center mb-4">
                                <button
                                    onClick={() => {
                                        setIsCreating(false)
                                        setEditingPost(null)
                                        setNewPostTitle('')
                                        setNewPostContent('')
                                    }}
                                    className="flex items-center gap-2 text-sm font-bold hover:text-primary/70 transition-colors"
                                >
                                    <ArrowLeft className="size-4" /> Back to List
                                </button>
                                <OSButton size="sm" variant="primary" onClick={handleSavePost}>
                                    <div className="flex items-center gap-1">
                                        <Save className="size-3" />
                                        <span>{editingPost ? (editingPost.isLocal ? 'Publish to Cloud' : 'Update Post') : 'Save Post'}</span>
                                    </div>
                                </OSButton>
                            </div>

                            <div className="mb-4">
                                <input
                                    type="text"
                                    placeholder="Post Title..."
                                    value={newPostTitle}
                                    onChange={(e) => setNewPostTitle(e.target.value)}
                                    className="w-full bg-transparent border-b border-primary py-2 text-xl font-black focus:outline-none placeholder:opacity-30"
                                />
                            </div>

                            <div className="flex-1 min-h-0">
                                <RichTextEditor content={newPostContent} onChange={setNewPostContent} />
                            </div>
                        </div>
                    )
                }

                return (
                    <div className="p-4 h-full flex flex-col text-primary">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-sm font-bold lowercase">manage content</h2>
                            <OSButton size="sm" variant="primary" onClick={() => setIsCreating(true)}>
                                <div className="flex items-center gap-1">
                                    <Plus className="size-3" />
                                    <span>new post</span>
                                </div>
                            </OSButton>
                        </div>

                        <div className="flex-grow overflow-y-auto custom-scrollbar border border-primary rounded bg-white">
                            {loading && (
                                <div className="p-8 text-center text-xs italic opacity-40">loading content...</div>
                            )}

                            {!loading && posts.length === 0 && (
                                <div className="text-center p-8">
                                    <IconNewspaper className="size-8 text-black/20 mx-auto mb-2" />
                                    <div className="text-black/40 italic text-sm font-medium lowercase">
                                        no articles found
                                    </div>
                                    <button
                                        onClick={() => setIsCreating(true)}
                                        className="mt-4 text-xs font-bold text-primary hover:underline lowercase"
                                    >
                                        + create your first post
                                    </button>
                                </div>
                            )}

                            {!loading && posts.length > 0 && (
                                <div className="divide-y divide-black/5">
                                    {posts.map(post => (
                                        <div key={post.id} className="p-3 flex items-center justify-between hover:bg-black/[0.02] group transition-colors">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black lowercase">{post.title}</span>
                                                    {post.isLocal && (
                                                        <span className="bg-blue-50 text-blue-500 text-[10px] px-1.5 py-0.5 rounded font-black border border-blue-200 uppercase tracking-tighter">read-only file</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] opacity-40 lowercase">
                                                    <span>{dayjs(post.created_at).format('MMM D, YYYY')}</span>
                                                    <span>•</span>
                                                    <span>/{post.slug}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <OSButton size="xs" variant="secondary" onClick={() => handleEditClick(post)}>
                                                    <Edit className="size-3" />
                                                </OSButton>
                                                {!post.isLocal && (
                                                    <OSButton size="xs" variant="secondary" onClick={() => deletePost(post.id)}>
                                                        <Trash2 className="size-3 text-red-500" />
                                                    </OSButton>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )
            case 'users':
                return (
                    <div className="p-4 h-full flex flex-col text-primary">
                        <h2 className="text-sm font-bold mb-4">manage users</h2>
                        <div className="border border-primary rounded flex-1 bg-white flex items-center justify-center">
                            <div className="text-center p-4">
                                <IconUser className="size-8 text-black/20 mx-auto mb-2" />
                                <div className="text-black/40 italic text-sm font-medium">
                                    user management module
                                </div>
                            </div>
                        </div>
                    </div>
                )
            case 'settings':
                return (
                    <div className="p-4 h-full flex flex-col text-primary">
                        <h2 className="text-sm font-bold mb-4">system settings</h2>
                        <div className="border border-primary rounded flex-1 bg-white flex items-center justify-center">
                            <div className="text-center p-4">
                                <Settings className="size-8 text-black/20 mx-auto mb-2" />
                                <div className="text-black/40 italic text-sm font-medium">
                                    System configuration
                                </div>
                            </div>
                        </div>
                    </div>
                )
            default:
                return null
        }
    }

    return (
        <div className="flex h-full w-full bg-primary text-primary overflow-hidden">
            {/* Sidebar */}
            <div className={`flex-shrink-0 border-r border-primary bg-accent/10 flex flex-col ${isMobile ? 'w-12 items-center py-2' : 'w-48 py-4'}`}>
                {!isMobile && (
                    <div className="px-4 mb-6">
                        <h1 className="font-bold text-sm tracking-wide opacity-50">admin</h1>
                    </div>
                )}

                <div className="flex flex-col gap-1 px-2 w-full">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left w-full
                                ${activeTab === tab.id
                                    ? 'bg-accent/20 text-primary font-bold shadow-sm ring-1 ring-primary/10'
                                    : 'text-muted hover:bg-accent/10 hover:text-primary'}
                                ${isMobile ? 'justify-center' : ''}
                            `}
                        >
                            <tab.icon className="size-4 flex-shrink-0" />
                            {!isMobile && <span>{tab.label}</span>}
                        </button>
                    ))}
                </div>

                <div className="mt-auto p-2">
                    <div className="text-[10px] text-center text-muted opacity-50">v1.2.0</div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto bg-white/50 h-full relative">
                {renderContent()}
            </div>
        </div>
    )
}

const StatCard = ({ title, value, change }: { title: string, value: string, change: string }) => {
    const isPositive = change.startsWith('+')
    return (
        <div className="p-3 border border-primary rounded bg-white shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-xs text-muted mb-1">{title}</h4>
            <div className="flex items-end justify-between">
                <span className="text-xl font-black tracking-tight">{value}</span>
                <span className={`text-xs font-bold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                    {change}
                </span>
            </div>
        </div>
    )
}

export default AdminPanel
