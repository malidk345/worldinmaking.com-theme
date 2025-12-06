import React from 'react'
import { useWindowManager } from '../context/WindowContext'
import PostHogWindow from './PostHogWindow'
import { motion, AnimatePresence } from 'framer-motion'

export default function WindowManager() {
    const {
        windows,
        focusedWindowId,
        closeWindow,
        bringToFront,
        updateWindowPosition,
        updateWindowSize,
        toggleMaximize,
        minimizeWindow
    } = useWindowManager()

    if (!windows || windows.length === 0) return null

    return (
        <AnimatePresence>
            {windows.map((window) => {
                // Only render if not minimized (or handle minimized visualization separately)
                if (window.minimized) return null

                return (
                    <PostHogWindow
                        key={window.id}
                        // Logic state from context
                        zIndex={window.zIndex}
                        isFocused={focusedWindowId === window.id}
                        position={window.position}

                        // Allow controlled mode by passing props that override internal state
                        // note: PostHogWindow needs to be updated to support 'controlled' mode if we want strict sync
                        // For now, we initialize it with these values. 
                        // Better approach: Update PostHogWindow to accept 'controlledPosition' etc.

                        // Content
                        post={window.content} // Assumption: content is the 'post' object

                        // Handlers
                        onClose={() => closeWindow(window.id)}
                        onFocus={() => bringToFront(window.id)}

                        // Pass context updaters to sync state if PostHogWindow supports it
                        // We probably need to update PostHogWindow to call these instead of local setPos
                        // For now, PostHogWindow manages its own drag state visually via Framer Motion
                        // We can pass initial props for now.

                        allPosts={[]} // Context might not know about all posts unless passed or globally available
                    />
                )
            })}
        </AnimatePresence>
    )
}
