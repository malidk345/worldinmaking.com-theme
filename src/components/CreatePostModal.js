import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

const CreatePostModal = ({ isOpen, onClose, onCreatePost }) => {
    const { user, isAuthenticated } = useAuth()
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        category: '',
        tags: ''
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')

    const categories = [
        'engineering',
        'product',
        'design',
        'company',
        'growth',
        'ceo diaries',
        'tutorials',
        'releases',
        'general'
    ]

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!isAuthenticated) {
            setError('please login to create a post')
            return
        }

        if (!formData.title.trim()) {
            setError('title is required')
            return
        }

        if (!formData.content.trim()) {
            setError('content is required')
            return
        }

        setIsSubmitting(true)
        
        try {
            const newPost = {
                id: `post-${Date.now()}`,
                title: formData.title.trim(),
                content: formData.content.trim(),
                category: formData.category || 'general',
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
                author: {
                    name: user?.name || user?.email || 'anonymous',
                    avatar: user?.avatar || null
                },
                date: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                featuredImage: null,
                likes: 0,
                comments: []
            }

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500))
            
            onCreatePost?.(newPost)
            
            // Reset form
            setFormData({
                title: '',
                content: '',
                category: '',
                tags: ''
            })
            
            onClose()
        } catch (err) {
            setError('failed to create post. please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Close on escape
    React.useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose()
            }
        }
        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]"
                        onClick={onClose}
                    />
                    
                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-lg bg-[rgb(var(--bg))] rounded-xl shadow-2xl border border-[rgb(var(--border))] z-[10000] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--border))]">
                            <h2 className="text-[15px] font-medium text-[rgb(var(--text-primary))] lowercase">
                                create new post
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg hover:bg-[rgb(var(--accent))] transition-colors"
                            >
                                <svg className="w-5 h-5 text-[rgb(var(--text-muted))]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        {!isAuthenticated ? (
                            <div className="px-4 py-12 text-center">
                                <svg className="w-12 h-12 mx-auto text-[rgb(var(--text-muted))] mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <circle cx="12" cy="8" r="4"/>
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                </svg>
                                <p className="text-[rgb(var(--text-muted))] text-[14px] mb-4 lowercase">
                                    you need to be logged in to create a post
                                </p>
                                <a
                                    href="/login"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--brand-red)] text-white rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity lowercase"
                                >
                                    login to continue
                                </a>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                                {/* Error */}
                                {error && (
                                    <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-[13px] lowercase">
                                        {error}
                                    </div>
                                )}

                                {/* Title */}
                                <div>
                                    <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1.5 lowercase">
                                        title *
                                    </label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        placeholder="enter post title..."
                                        className="w-full px-3 py-2.5 bg-[rgb(var(--accent))] border border-[rgb(var(--border))] rounded-lg text-[14px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-muted))] outline-none focus:border-[var(--brand-red)] transition-colors lowercase"
                                    />
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1.5 lowercase">
                                        category
                                    </label>
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2.5 bg-[rgb(var(--accent))] border border-[rgb(var(--border))] rounded-lg text-[14px] text-[rgb(var(--text-primary))] outline-none focus:border-[var(--brand-red)] transition-colors lowercase appearance-none cursor-pointer"
                                    >
                                        <option value="">select a category</option>
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Content */}
                                <div>
                                    <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1.5 lowercase">
                                        content *
                                    </label>
                                    <textarea
                                        name="content"
                                        value={formData.content}
                                        onChange={handleChange}
                                        placeholder="write your post content..."
                                        rows={6}
                                        className="w-full px-3 py-2.5 bg-[rgb(var(--accent))] border border-[rgb(var(--border))] rounded-lg text-[14px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-muted))] outline-none focus:border-[var(--brand-red)] transition-colors lowercase resize-none"
                                    />
                                </div>

                                {/* Tags */}
                                <div>
                                    <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1.5 lowercase">
                                        tags (comma separated)
                                    </label>
                                    <input
                                        type="text"
                                        name="tags"
                                        value={formData.tags}
                                        onChange={handleChange}
                                        placeholder="react, design, tutorial..."
                                        className="w-full px-3 py-2.5 bg-[rgb(var(--accent))] border border-[rgb(var(--border))] rounded-lg text-[14px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-muted))] outline-none focus:border-[var(--brand-red)] transition-colors lowercase"
                                    />
                                </div>

                                {/* Submit */}
                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 text-[13px] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors lowercase"
                                    >
                                        cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-4 py-2 bg-[var(--brand-red)] text-white rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity lowercase disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25"/>
                                                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                                </svg>
                                                creating...
                                            </>
                                        ) : (
                                            'create post'
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default CreatePostModal
