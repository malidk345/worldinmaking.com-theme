import React, { useState, useRef, useEffect, useCallback } from 'react'

// Window Component - Desktop-style window like PostHog
export default function Window({ 
  isOpen, 
  onClose, 
  title, 
  children,
  initialPosition = { x: 100, y: 50 },
  initialSize = { width: 700, height: 500 },
  minSize = { width: 400, height: 300 },
  zIndex = 100,
  onFocus
}) {
  const [position, setPosition] = useState(initialPosition)
  const [size, setSize] = useState(initialSize)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeDirection, setResizeDirection] = useState(null)
  const [isMaximized, setIsMaximized] = useState(false)
  const [previousState, setPreviousState] = useState({ position, size })
  const [isClosing, setIsClosing] = useState(false)
  
  const windowRef = useRef(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 })

  // Handle dragging
  const handleMouseDown = (e) => {
    if (e.target.closest('.window-controls') || e.target.closest('.resize-handle')) return
    setIsDragging(true)
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    }
    onFocus?.()
  }

  const handleMouseMove = useCallback((e) => {
    if (isDragging && !isMaximized) {
      const newX = Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragOffset.current.x))
      const newY = Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - dragOffset.current.y))
      setPosition({ x: newX, y: newY })
    }
    
    if (isResizing) {
      const deltaX = e.clientX - resizeStart.current.x
      const deltaY = e.clientY - resizeStart.current.y
      
      let newWidth = resizeStart.current.width
      let newHeight = resizeStart.current.height
      let newX = resizeStart.current.posX
      let newY = resizeStart.current.posY
      
      if (resizeDirection?.includes('e')) {
        newWidth = Math.max(minSize.width, resizeStart.current.width + deltaX)
      }
      if (resizeDirection?.includes('w')) {
        const widthDelta = resizeStart.current.width - deltaX
        if (widthDelta >= minSize.width) {
          newWidth = widthDelta
          newX = resizeStart.current.posX + deltaX
        }
      }
      if (resizeDirection?.includes('s')) {
        newHeight = Math.max(minSize.height, resizeStart.current.height + deltaY)
      }
      if (resizeDirection?.includes('n')) {
        const heightDelta = resizeStart.current.height - deltaY
        if (heightDelta >= minSize.height) {
          newHeight = heightDelta
          newY = resizeStart.current.posY + deltaY
        }
      }
      
      setSize({ width: newWidth, height: newHeight })
      setPosition({ x: newX, y: newY })
    }
  }, [isDragging, isResizing, resizeDirection, isMaximized, size.width, size.height, minSize])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
    setResizeDirection(null)
  }, [])

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp])

  // Resize handlers
  const startResize = (direction) => (e) => {
    e.stopPropagation()
    setIsResizing(true)
    setResizeDirection(direction)
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
      posX: position.x,
      posY: position.y
    }
    onFocus?.()
  }

  // Maximize/Restore
  const handleMaximize = () => {
    if (isMaximized) {
      setPosition(previousState.position)
      setSize(previousState.size)
      setIsMaximized(false)
    } else {
      setPreviousState({ position, size })
      setPosition({ x: 0, y: 0 })
      setSize({ width: window.innerWidth, height: window.innerHeight - 60 })
      setIsMaximized(true)
    }
  }

  // Close with animation
  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
      setIsClosing(false)
    }, 200)
  }

  if (!isOpen) return null

  return (
    <div
      ref={windowRef}
      className={`window-container ${isClosing ? 'window-closing' : 'window-opening'}`}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex,
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={onFocus}
    >
      {/* Window Chrome */}
      <div className="window-chrome">
        {/* Title Bar */}
        <div 
          className="window-titlebar"
          onMouseDown={handleMouseDown}
          onDoubleClick={handleMaximize}
        >
          {/* Traffic Light Buttons (macOS style) */}
          <div className="window-controls">
            <button 
              className="window-btn window-btn-close"
              onClick={handleClose}
              title="Close"
            >
              <svg viewBox="0 0 12 12" className="w-2 h-2 opacity-0 group-hover:opacity-100">
                <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              </svg>
            </button>
            <button 
              className="window-btn window-btn-minimize"
              onClick={handleClose}
              title="Minimize"
            >
              <svg viewBox="0 0 12 12" className="w-2 h-2 opacity-0 group-hover:opacity-100">
                <path d="M2 6h8" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              </svg>
            </button>
            <button 
              className="window-btn window-btn-maximize"
              onClick={handleMaximize}
              title={isMaximized ? "Restore" : "Maximize"}
            >
              <svg viewBox="0 0 12 12" className="w-2 h-2 opacity-0 group-hover:opacity-100">
                {isMaximized ? (
                  <path d="M3 3h6v6H3z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                ) : (
                  <path d="M2 4l4-2 4 2v4l-4 2-4-2z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                )}
              </svg>
            </button>
          </div>

          {/* Title */}
          <div className="window-title">
            {title}
          </div>

          {/* Spacer */}
          <div className="w-20"></div>
        </div>

        {/* Content */}
        <div className="window-content">
          {children}
        </div>
      </div>

      {/* Resize Handles */}
      {!isMaximized && (
        <>
          <div className="resize-handle resize-n" onMouseDown={startResize('n')} />
          <div className="resize-handle resize-s" onMouseDown={startResize('s')} />
          <div className="resize-handle resize-e" onMouseDown={startResize('e')} />
          <div className="resize-handle resize-w" onMouseDown={startResize('w')} />
          <div className="resize-handle resize-ne" onMouseDown={startResize('ne')} />
          <div className="resize-handle resize-nw" onMouseDown={startResize('nw')} />
          <div className="resize-handle resize-se" onMouseDown={startResize('se')} />
          <div className="resize-handle resize-sw" onMouseDown={startResize('sw')} />
        </>
      )}
    </div>
  )
}

// Post Content for Window
export function PostWindowContent({ post }) {
  if (!post) return null

  const { title, date, excerpt, image, category, content, author } = post

  return (
    <div className="post-window-content">
      {/* Featured Image */}
      {image ? (
        <div className="w-full aspect-[16/9] bg-gray-100 overflow-hidden">
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
        <div className="mt-8 pt-6 border-t border-gray-200 flex gap-3">
          <button className="btn-primary">
            Read Full Article →
          </button>
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
