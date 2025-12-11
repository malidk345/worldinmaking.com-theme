import React, { useState } from 'react'
import {
    IconHome, IconDocument, IconUsers, IconChart,
    IconPlus, IconSearch, IconX, IconClock
} from './Icons'

// Dashboard Layout Component
export default function Dashboard({ posts = [], onCreatePost, onDeletePost }) {
    const [activeTab, setActiveTab] = useState('overview')
    const [searchTerm, setSearchTerm] = useState('')

    const stats = [
        { label: 'Total Posts', value: posts.length, icon: IconDocument, change: '+12%' },
        { label: 'Total Views', value: '45.2k', icon: IconUsers, change: '+24%' },
        { label: 'Avg. Read Time', value: '5m', icon: IconClock, change: '-2%' },
        { label: 'Engagement', value: '8.4%', icon: IconChart, change: '+4.1%' },
    ]

    const filteredPosts = posts.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.author?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const SidebarItem = ({ id, icon: Icon, label }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${activeTab === id
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    )

    return (
        <div className="flex h-full bg-white dark:bg-[#151515] text-gray-900 dark:text-gray-100">
            {/* Sidebar */}
            <div className="w-56 border-r border-gray-200 dark:border-gray-800 flex flex-col p-4 bg-gray-50/50 dark:bg-[#111]">
                <div className="mb-6 px-2">
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Management</h2>
                </div>

                <div className="space-y-1">
                    <SidebarItem id="overview" icon={IconChart} label="Overview" />
                    <SidebarItem id="posts" icon={IconDocument} label="All Posts" />
                    <SidebarItem id="users" icon={IconUsers} label="Users" />
                </div>

                <div className="mt-8 mb-6 px-2">
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">System</h2>
                </div>
                <div className="space-y-1">
                    <SidebarItem id="settings" icon={IconChart} label="Settings" />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold">
                            {activeTab === 'overview' && 'Dashboard Overview'}
                            {activeTab === 'posts' && 'Content Management'}
                            {activeTab === 'users' && 'User Management'}
                            {activeTab === 'settings' && 'System Settings'}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Manage your content and analytics
                        </p>
                    </div>

                    {activeTab === 'posts' && (
                        <button
                            onClick={onCreatePost}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <IconPlus className="w-4 h-4" />
                            New Post
                        </button>
                    )}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-8">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {stats.map((stat, idx) => (
                                <div key={idx} className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                            <stat.icon className="w-5 h-5" />
                                        </div>
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${stat.change.startsWith('+')
                                                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                            }`}>
                                            {stat.change}
                                        </span>
                                    </div>
                                    <div className="text-2xl font-bold mb-1">{stat.value}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Recent Activity Mockup */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="font-semibold text-sm">Recent Activity</h3>
                            </div>
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {[1, 2, 3].map((_, i) => (
                                    <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                        <p className="text-sm">
                                            <span className="font-medium text-gray-900 dark:text-white">John Doe</span> created a new post <span className="text-gray-500">"The Future of AI"</span>
                                        </p>
                                        <span className="ml-auto text-xs text-gray-400">2h ago</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Posts Tab */}
                {activeTab === 'posts' && (
                    <div className="space-y-4">
                        {/* Toolbar */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="relative flex-1 max-w-md">
                                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search posts..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                            </div>
                        </div>

                        {/* Posts Table */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-medium">
                                        <tr>
                                            <th className="px-6 py-3">Title</th>
                                            <th className="px-6 py-3">Category</th>
                                            <th className="px-6 py-3">Author</th>
                                            <th className="px-6 py-3">Date</th>
                                            <th className="px-6 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {filteredPosts.map((post) => (
                                            <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-6 py-3 font-medium text-gray-900 dark:text-white max-w-[200px] truncate">
                                                    {post.title}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                        {post.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[10px] font-bold">
                                                            {(post.author?.name?.[0] || 'A').toUpperCase()}
                                                        </div>
                                                        <span>{post.author?.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-gray-500">{post.date}</td>
                                                <td className="px-6 py-3 text-right">
                                                    <button
                                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                                        onClick={() => onDeletePost && onDeletePost(post.id)}
                                                        title="Delete"
                                                    >
                                                        <IconX className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {filteredPosts.length === 0 && (
                                <div className="p-8 text-center text-gray-500">
                                    No posts found matching your search.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Users Tab (Mock) */}
                {activeTab === 'users' && (
                    <div className="flex items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                        <div className="text-center">
                            <IconUsers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>User management coming soon</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
