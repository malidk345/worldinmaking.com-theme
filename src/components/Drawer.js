import React, { useEffect } from 'react'

// Drawer Component - PostHog Style (slides from right)
export default function Drawer({ isOpen, onClose, children, title }) {
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden' // Prevent background scroll
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="drawer-wrapper fixed inset-0 z-[9999]">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-dark-bg/60 backdrop-blur-sm transition-opacity animate-fadeIn"
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div className="fixed top-0 right-0 h-full flex items-stretch justify-end">
        <div 
          className="drawer-panel relative w-[600px] max-w-[95vw] h-full bg-light shadow-2xl animate-slideIn overflow-hidden"
        >
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 bg-tan hover:bg-gray-200 rounded-full transition-colors group"
          >
            <svg 
              className="w-5 h-5 text-gray-600 group-hover:text-gray-900 transition-colors" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Content */}
          <div className="h-full overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

// Post Detail Content Component
export function PostDetail({ post }) {
  if (!post) return null

  const { title, date, excerpt, image, category, content, author } = post

  return (
    <div className="post-detail">
      {/* Featured Image */}
      {image ? (
        <div className="w-full aspect-[16/9] bg-gray-100">
          <img 
            className="w-full h-full object-cover" 
            src={image} 
            alt={title}
          />
        </div>
      ) : (
        <div className="w-full aspect-[16/9] bg-gradient-to-br from-tan to-gray-200 flex items-center justify-center">
          <span className="text-8xl">{getCategoryEmoji(category)}</span>
        </div>
      )}

      {/* Post Content */}
      <div className="p-6 md:p-8">
        {/* Category & Date */}
        <div className="flex items-center gap-3 mb-4">
          {category && (
            <span className={`px-2 py-1 text-xs font-semibold rounded-sm ${getCategoryColor(category)}`}>
              {category}
            </span>
          )}
          <span className="text-sm text-gray-500">{date}</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 leading-tight">
          {title}
        </h1>

        {/* Author */}
        {author && (
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
            <div className="w-10 h-10 bg-tan rounded-full flex items-center justify-center text-sm font-bold text-gray-700">
              {author.name[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">{author.name}</p>
              <p className="text-gray-500 text-xs">{author.role}</p>
            </div>
          </div>
        )}

        {/* Excerpt */}
        {excerpt && (
          <p className="text-lg text-gray-600 mb-6 leading-relaxed font-medium">
            {excerpt}
          </p>
        )}

        {/* Content */}
        {content && (
          <div className="prose prose-gray max-w-none">
            {content.split('\n\n').map((paragraph, index) => (
              <p key={index} className="text-gray-700 mb-4 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <a href="#" className="btn-primary mr-3">
            Read Full Article →
          </a>
          <button className="btn-secondary">
            Share
          </button>
        </div>
      </div>
    </div>
  )
}

// Helper functions
function getCategoryEmoji(category) {
  const emojis = {
    'Engineering': '⚙️',
    'Product': '📊',
    'Design': '🎨',
    'Startup': '🚀',
    'Culture': '🌟',
    'Tutorial': '📚',
    'News': '📢',
    'Release': '🎉',
  }
  return emojis[category] || '📝'
}

function getCategoryColor(category) {
  const colors = {
    'Engineering': 'bg-blue/10 text-blue',
    'Product': 'bg-green/10 text-green-600',
    'Design': 'bg-purple/10 text-purple-600',
    'Startup': 'bg-red/10 text-red',
    'Culture': 'bg-yellow/10 text-yellow-600',
    'Tutorial': 'bg-teal/10 text-teal-600',
    'News': 'bg-orange/10 text-orange-600',
    'Release': 'bg-pink/10 text-pink-600',
  }
  return colors[category] || 'bg-gray-100 text-gray-600'
}
