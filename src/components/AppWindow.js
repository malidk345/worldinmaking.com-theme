import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, useDragControls, AnimatePresence } from 'framer-motion'
import { useWindowManager } from '../context/WindowContext'

// PostHog-style AppWindow component
export default function AppWindow({ windowData }) {
  const {
    closeWindow,
    bringToFront,
    minimizeWindow,
    toggleMaximize,
    updateWindowPosition,
    updateWindowSize,
    snapToSide,
    focusedWindowId,
    taskbarHeight,
    constraintsRef,
  } = useWindowManager()

  const { id, title, content, position, size, minSize, zIndex, minimized, maximized } = windowData
  
  const controls = useDragControls()
  const windowRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [snapIndicator, setSnapIndicator] = useState(null)
  const [isClosing, setIsClosing] = useState(false)
  
  const isFocused = focusedWindowId === id
  const snapThreshold = -50

  // Handle drag
  const handleDrag = (event, info) => {
    if (!isDragging) setIsDragging(true)
    if (maximized) return
    
    const newX = position.x + info.offset.x
    const viewportWidth = window.innerWidth

    if (newX < snapThreshold) {
      setSnapIndicator('left')
    } else if (newX > viewportWidth - size.width + snapThreshold) {
      setSnapIndicator('right')
    } else {
      setSnapIndicator(null)
    }
  }

  const handleDragEnd = (event, info) => {
    setIsDragging(false)
    
    if (snapIndicator) {
      snapToSide(id, snapIndicator)
      setSnapIndicator(null)
      return
    }

    const newX = Math.max(0, Math.min(window.innerWidth - size.width, position.x + info.offset.x))
    const newY = Math.max(0, Math.min(window.innerHeight - taskbarHeight - size.height, position.y + info.offset.y))
    
    updateWindowPosition(id, { x: newX, y: newY })
  }

  // Handle resize
  const handleResize = useCallback((direction, deltaX, deltaY) => {
    let newWidth = size.width
    let newHeight = size.height
    let newX = position.x
    let newY = position.y

    if (direction.includes('e')) {
      newWidth = Math.max(minSize.width, size.width + deltaX)
    }
    if (direction.includes('w')) {
      const widthDelta = size.width - deltaX
      if (widthDelta >= minSize.width) {
        newWidth = widthDelta
        newX = position.x + deltaX
      }
    }
    if (direction.includes('s')) {
      newHeight = Math.max(minSize.height, size.height + deltaY)
    }
    if (direction.includes('n')) {
      const heightDelta = size.height - deltaY
      if (heightDelta >= minSize.height) {
        newHeight = heightDelta
        newY = position.y + deltaY
      }
    }

    updateWindowSize(id, { width: newWidth, height: newHeight }, { x: newX, y: newY })
  }, [size, position, minSize, id, updateWindowSize])

  // Handle close with animation
  const handleClose = () => {
    setIsClosing(true)
  }

  // Handle mouse down to bring to front
  const handleMouseDown = () => {
    if (!isFocused) {
      bringToFront(id)
    }
  }

  // Resize handle component
  const ResizeHandle = ({ direction, cursor }) => {
    const startResize = (e) => {
      e.stopPropagation()
      setIsResizing(true)
      bringToFront(id)
      
      const startX = e.clientX
      const startY = e.clientY
      const startWidth = size.width
      const startHeight = size.height
      const startPosX = position.x
      const startPosY = position.y

      const onMouseMove = (e) => {
        const deltaX = e.clientX - startX
        const deltaY = e.clientY - startY
        
        let newWidth = startWidth
        let newHeight = startHeight
        let newX = startPosX
        let newY = startPosY

        if (direction.includes('e')) {
          newWidth = Math.max(minSize.width, startWidth + deltaX)
        }
        if (direction.includes('w')) {
          const widthChange = startWidth - deltaX
          if (widthChange >= minSize.width) {
            newWidth = widthChange
            newX = startPosX + deltaX
          }
        }
        if (direction.includes('s')) {
          newHeight = Math.max(minSize.height, startHeight + deltaY)
        }
        if (direction.includes('n')) {
          const heightChange = startHeight - deltaY
          if (heightChange >= minSize.height) {
            newHeight = heightChange
            newY = startPosY + deltaY
          }
        }

        updateWindowSize(id, { width: newWidth, height: newHeight }, { x: newX, y: newY })
      }

      const onMouseUp = () => {
        setIsResizing(false)
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    }

    const positionStyles = {
      n: 'top-0 left-2 right-2 h-1 cursor-n-resize',
      s: 'bottom-0 left-2 right-2 h-1 cursor-s-resize',
      e: 'right-0 top-2 bottom-2 w-1 cursor-e-resize',
      w: 'left-0 top-2 bottom-2 w-1 cursor-w-resize',
      ne: 'top-0 right-0 w-3 h-3 cursor-ne-resize',
      nw: 'top-0 left-0 w-3 h-3 cursor-nw-resize',
      se: 'bottom-0 right-0 w-3 h-3 cursor-se-resize',
      sw: 'bottom-0 left-0 w-3 h-3 cursor-sw-resize',
    }

    return (
      <div 
        className={`absolute z-20 ${positionStyles[direction]}`}
        onMouseDown={startResize}
      />
    )
  }

  if (minimized) return null

  return (
    <AnimatePresence onExitComplete={() => closeWindow(id)}>
      {!isClosing && (
        <>
          {/* Snap Indicator */}
          {snapIndicator && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              className="fixed border-2 border-blue rounded-md pointer-events-none"
              style={{
                left: snapIndicator === 'left' ? 8 : '50%',
                right: snapIndicator === 'right' ? 8 : 'auto',
                top: 8,
                width: 'calc(50% - 12px)',
                height: `calc(100% - ${taskbarHeight + 16}px)`,
                background: 'rgba(47, 128, 250, 0.2)',
              }}
            />
          )}

          {/* Window */}
          <motion.div
            ref={windowRef}
            className={`app-window absolute flex flex-col ${
              isFocused 
                ? 'shadow-2xl ring-1 ring-gray-300' 
                : 'shadow-lg ring-1 ring-gray-200'
            } ${isDragging ? 'select-none' : ''}`}
            style={{ zIndex }}
            initial={{ 
              scale: 0.9, 
              opacity: 0,
              x: position.x,
              y: position.y,
            }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              x: position.x,
              y: position.y,
              width: size.width,
              height: size.height,
            }}
            exit={{ 
              scale: 0.9, 
              opacity: 0,
              transition: { duration: 0.15 }
            }}
            transition={{ 
              type: 'spring',
              stiffness: 400,
              damping: 30,
              mass: 0.8,
            }}
            drag={!maximized}
            dragControls={controls}
            dragListener={false}
            dragMomentum={false}
            dragConstraints={constraintsRef}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            onMouseDown={handleMouseDown}
          >
            {/* Title Bar */}
            <div 
              className={`window-titlebar flex items-center justify-between px-2 py-1.5 cursor-move select-none ${
                isFocused 
                  ? 'bg-gradient-to-b from-gray-100 to-gray-200 border-b border-gray-300' 
                  : 'bg-gray-100 border-b border-gray-200'
              }`}
              onPointerDown={(e) => {
                if (!e.target.closest('.window-btn')) {
                  controls.start(e)
                }
              }}
              onDoubleClick={() => toggleMaximize(id)}
            >
              {/* Traffic Light Buttons */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 group">
                  {/* Close */}
                  <button 
                    className="window-btn w-3 h-3 rounded-full bg-[#FF5F57] hover:bg-[#FF3B30] flex items-center justify-center transition-colors"
                    onClick={handleClose}
                  >
                    <svg className="w-2 h-2 opacity-0 group-hover:opacity-100 text-[#4D0000]" viewBox="0 0 12 12">
                      <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
                    </svg>
                  </button>
                  {/* Minimize */}
                  <button 
                    className="window-btn w-3 h-3 rounded-full bg-[#FFBD2E] hover:bg-[#FF9500] flex items-center justify-center transition-colors"
                    onClick={() => minimizeWindow(id)}
                  >
                    <svg className="w-2 h-2 opacity-0 group-hover:opacity-100 text-[#995700]" viewBox="0 0 12 12">
                      <path d="M2.5 6h7" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
                    </svg>
                  </button>
                  {/* Maximize */}
                  <button 
                    className="window-btn w-3 h-3 rounded-full bg-[#28C840] hover:bg-[#34C759] flex items-center justify-center transition-colors"
                    onClick={() => toggleMaximize(id)}
                  >
                    <svg className="w-2 h-2 opacity-0 group-hover:opacity-100 text-[#006500]" viewBox="0 0 12 12">
                      {maximized ? (
                        <path d="M3 5l3-2 3 2v4l-3 2-3-2z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      ) : (
                        <path d="M2 4l4-2 4 2v5l-4 2-4-2z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="flex-1 text-center">
                <span className="text-sm font-medium text-gray-700 truncate px-4">
                  {title}
                </span>
              </div>

              {/* Spacer for balance */}
              <div className="w-16"></div>
            </div>

            {/* Content */}
            <div className="window-content flex-1 overflow-auto bg-light">
              {content}
            </div>

            {/* Resize Handles */}
            {!maximized && (
              <>
                <ResizeHandle direction="n" />
                <ResizeHandle direction="s" />
                <ResizeHandle direction="e" />
                <ResizeHandle direction="w" />
                <ResizeHandle direction="ne" />
                <ResizeHandle direction="nw" />
                <ResizeHandle direction="se" />
                <ResizeHandle direction="sw" />
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
