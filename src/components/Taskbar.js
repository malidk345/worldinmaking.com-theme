import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWindowManager } from '../context/WindowContext'

// PostHog-style Taskbar component
export default function Taskbar() {
  const { windows, restoreWindow, focusedWindowId, taskbarHeight } = useWindowManager()
  
  const minimizedWindows = windows.filter(w => w.minimized)
  const openWindows = windows.filter(w => !w.minimized)

  return (
    <motion.div 
      className="taskbar fixed bottom-0 left-0 right-0 flex items-center justify-between px-4 bg-[#151515] border-t border-gray-800 z-[9999]"
      style={{ height: taskbarHeight }}
      initial={{ y: taskbarHeight }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {/* Left - Logo/Brand */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-orange to-yellow flex items-center justify-center">
            <span className="text-white text-xs font-bold">W</span>
          </div>
          <span className="text-white text-sm font-semibold hidden sm:block">worldinmaking</span>
        </div>
      </div>

      {/* Center - Open Windows */}
      <div className="flex items-center gap-1 overflow-x-auto max-w-[60%]">
        <AnimatePresence>
          {openWindows.map((window) => (
            <motion.button
              key={window.id}
              className={`taskbar-item flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                focusedWindowId === window.id
                  ? 'bg-white/20 text-white'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className={`w-2 h-2 rounded-full ${
                focusedWindowId === window.id ? 'bg-orange' : 'bg-gray-500'
              }`} />
              <span className="text-xs font-medium truncate max-w-[100px]">
                {window.title}
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Right - Minimized Windows */}
      <div className="flex items-center gap-2">
        <AnimatePresence>
          {minimizedWindows.map((window) => (
            <motion.button
              key={window.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              onClick={() => restoreWindow(window.id)}
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0, y: 20 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="4" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M3 4V3a2 2 0 012-2h2a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <span className="text-xs font-medium truncate max-w-[80px]">
                {window.title}
              </span>
            </motion.button>
          ))}
        </AnimatePresence>

        {/* Clock/Time */}
        <div className="text-gray-400 text-xs ml-4 hidden sm:block">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  )
}
