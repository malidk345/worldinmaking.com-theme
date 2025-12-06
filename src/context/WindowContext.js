import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'

// Window type definition
export const WindowContext = createContext(null)

// Default window settings
const DEFAULT_SIZE = { width: 800, height: 600 }
const DEFAULT_MIN_SIZE = { width: 400, height: 300 }
const TASKBAR_HEIGHT = 48

// Generate unique ID
let windowIdCounter = 0
const generateWindowId = () => `window-${++windowIdCounter}`

// Window Provider - manages all windows
export function WindowProvider({ children }) {
  const [windows, setWindows] = useState([])
  const [focusedWindowId, setFocusedWindowId] = useState(null)
  const [topZIndex, setTopZIndex] = useState(100)
  const constraintsRef = useRef(null)

  // Add a new window
  const addWindow = useCallback((config) => {
    const id = generateWindowId()
    const offset = windows.length * 30
    
    const newWindow = {
      id,
      title: config.title || 'Untitled',
      content: config.content,
      position: config.position || { 
        x: Math.min(80 + offset, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 850), 
        y: Math.min(40 + offset, (typeof window !== 'undefined' ? window.innerHeight : 800) - 650)
      },
      size: config.size || { ...DEFAULT_SIZE },
      minSize: config.minSize || { ...DEFAULT_MIN_SIZE },
      zIndex: topZIndex + 1,
      minimized: false,
      maximized: false,
      previousPosition: null,
      previousSize: null,
      meta: config.meta || {},
    }
    
    setTopZIndex(prev => prev + 1)
    setFocusedWindowId(id)
    setWindows(prev => [...prev, newWindow])
    
    return id
  }, [windows.length, topZIndex])

  // Close a window
  const closeWindow = useCallback((id) => {
    setWindows(prev => prev.filter(w => w.id !== id))
    if (focusedWindowId === id) {
      setFocusedWindowId(null)
    }
  }, [focusedWindowId])

  // Bring window to front
  const bringToFront = useCallback((id) => {
    const newZIndex = topZIndex + 1
    setTopZIndex(newZIndex)
    setFocusedWindowId(id)
    setWindows(prev => prev.map(w => 
      w.id === id ? { ...w, zIndex: newZIndex } : w
    ))
  }, [topZIndex])

  // Minimize window
  const minimizeWindow = useCallback((id) => {
    setWindows(prev => prev.map(w => 
      w.id === id ? { ...w, minimized: true } : w
    ))
  }, [])

  // Restore minimized window
  const restoreWindow = useCallback((id) => {
    const newZIndex = topZIndex + 1
    setTopZIndex(newZIndex)
    setFocusedWindowId(id)
    setWindows(prev => prev.map(w => 
      w.id === id ? { ...w, minimized: false, zIndex: newZIndex } : w
    ))
  }, [topZIndex])

  // Maximize/restore window
  const toggleMaximize = useCallback((id) => {
    setWindows(prev => prev.map(w => {
      if (w.id !== id) return w
      
      if (w.maximized) {
        // Restore
        return {
          ...w,
          maximized: false,
          position: w.previousPosition || w.position,
          size: w.previousSize || w.size,
        }
      } else {
        // Maximize
        return {
          ...w,
          maximized: true,
          previousPosition: { ...w.position },
          previousSize: { ...w.size },
          position: { x: 0, y: 0 },
          size: { 
            width: typeof window !== 'undefined' ? window.innerWidth : 1200, 
            height: typeof window !== 'undefined' ? window.innerHeight - TASKBAR_HEIGHT : 752 
          },
        }
      }
    }))
  }, [])

  // Update window position
  const updateWindowPosition = useCallback((id, position) => {
    setWindows(prev => prev.map(w => 
      w.id === id ? { ...w, position } : w
    ))
  }, [])

  // Update window size
  const updateWindowSize = useCallback((id, size, position = null) => {
    setWindows(prev => prev.map(w => 
      w.id === id ? { ...w, size, ...(position ? { position } : {}) } : w
    ))
  }, [])

  // Snap to side
  const snapToSide = useCallback((id, side) => {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight - TASKBAR_HEIGHT : 752
    
    setWindows(prev => prev.map(w => {
      if (w.id !== id) return w
      
      return {
        ...w,
        previousPosition: { ...w.position },
        previousSize: { ...w.size },
        position: { x: side === 'left' ? 0 : viewportWidth / 2, y: 0 },
        size: { width: viewportWidth / 2, height: viewportHeight },
      }
    }))
  }, [])

  const value = {
    windows,
    focusedWindowId,
    addWindow,
    closeWindow,
    bringToFront,
    minimizeWindow,
    restoreWindow,
    toggleMaximize,
    updateWindowPosition,
    updateWindowSize,
    snapToSide,
    constraintsRef,
    taskbarHeight: TASKBAR_HEIGHT,
  }

  return (
    <WindowContext.Provider value={value}>
      <div ref={constraintsRef} className="window-manager">
        {children}
      </div>
    </WindowContext.Provider>
  )
}

export function useWindowManager() {
  const context = useContext(WindowContext)
  if (!context) {
    throw new Error('useWindowManager must be used within WindowProvider')
  }
  return context
}
