'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MinimizeIcon, MaximizeIcon, RestoreIcon, CloseWindowIcon } from './WindowIcons';

/**
 * Window Component with Desktop-like Animations
 * 
 * - Mobile: Opens maximized, minimizes with slide down
 * - Desktop: Opens centered, minimizes with scale down
 * - Smooth spring animations throughout
 */

const HEADER_HEIGHT = 45;
const MARGIN = 8;
const MOBILE_BREAKPOINT = 768;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 200;
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

// Smooth spring config - tuned for natural feel
const springConfig = {
    type: 'spring',
    stiffness: 300,
    damping: 28,
    mass: 0.8
};

const fastSpring = {
    type: 'spring',
    stiffness: 400,
    damping: 32,
    mass: 0.6
};

const Window = ({
    id,
    title,
    icon,
    children,
    toolbar,
    onClose,
    onFocus,
    zIndex = 10,
    isMaximized: isMaximizedProp = true,
    isMinimized: isMinimizedProp = false,
    initialX,
    initialY,
    initialWidth = DEFAULT_WIDTH,
    initialHeight = DEFAULT_HEIGHT,
    onMaximizeChange,
    onMinimizeChange,
    onPositionChange,
    onSizeChange
}) => {
    const [isMobile, setIsMobile] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);

    // Window states
    const [isMaximized, setIsMaximized] = useState(isMaximizedProp);
    const [isMinimized, setIsMinimized] = useState(isMinimizedProp);

    // Position and size for windowed mode
    const [pos, setPos] = useState({ x: initialX ?? 0, y: initialY ?? 0 });
    const [size, setSize] = useState({ width: initialWidth, height: initialHeight });

    // Store position before maximize for restore
    const preMaximizeState = useRef({ x: 0, y: 0, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });

    const windowRef = useRef(null);
    const posRef = useRef(pos);
    const sizeRef = useRef(size);
    const dragStartRef = useRef(null);
    const resizeStartRef = useRef(null);
    const [, forceUpdate] = useState({});

    // Sync refs
    useEffect(() => { posRef.current = pos; }, [pos]);
    useEffect(() => { sizeRef.current = size; }, [size]);

    // Initial mount - detect mobile and set centered position
    useEffect(() => {
        const mobile = window.innerWidth < MOBILE_BREAKPOINT;
        setIsMobile(mobile);

        const viewWidth = window.innerWidth;
        const viewHeight = window.innerHeight;
        const maxWidth = viewWidth - MARGIN * 2;
        const maxHeight = viewHeight - HEADER_HEIGHT - MARGIN * 2;

        const windowWidth = Math.min(initialWidth, maxWidth);
        const windowHeight = Math.min(initialHeight, maxHeight);

        // Center the window
        const centeredX = initialX ?? Math.max(MARGIN, (viewWidth - windowWidth) / 2);
        const centeredY = initialY ?? Math.max(HEADER_HEIGHT + MARGIN, (viewHeight - windowHeight) / 2);

        setPos({ x: centeredX, y: centeredY });
        setSize({ width: windowWidth, height: windowHeight });
        preMaximizeState.current = { x: centeredX, y: centeredY, width: windowWidth, height: windowHeight };

        // Mobile: Always start maximized
        if (mobile) {
            setIsMaximized(true);
        } else {
            setIsMaximized(isMaximizedProp);
        }

        // Small delay for mount animation
        requestAnimationFrame(() => {
            setIsMounted(true);
        });
    }, []);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < MOBILE_BREAKPOINT;
            setIsMobile(mobile);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Sync external props
    useEffect(() => { setIsMaximized(isMaximizedProp); }, [isMaximizedProp]);
    useEffect(() => { setIsMinimized(isMinimizedProp); }, [isMinimizedProp]);

    // Drag handlers
    const handleDragMove = useCallback((clientX, clientY) => {
        if (!dragStartRef.current || !windowRef.current) return;
        const dx = clientX - dragStartRef.current.mouseX;
        const dy = clientY - dragStartRef.current.mouseY;
        let newX = dragStartRef.current.initialX + dx;
        let newY = dragStartRef.current.initialY + dy;

        newX = Math.max(MARGIN, Math.min(newX, window.innerWidth - sizeRef.current.width - MARGIN));
        newY = Math.max(HEADER_HEIGHT + MARGIN, Math.min(newY, window.innerHeight - sizeRef.current.height - MARGIN));

        dragStartRef.current.lastValidX = newX;
        dragStartRef.current.lastValidY = newY;

        const effectiveDeltaX = newX - dragStartRef.current.initialX;
        const effectiveDeltaY = newY - dragStartRef.current.initialY;
        windowRef.current.style.transform = `translate3d(${effectiveDeltaX}px, ${effectiveDeltaY}px, 0)`;
    }, []);

    const handleDragEnd = useCallback(() => {
        if (dragStartRef.current && windowRef.current) {
            const newPos = { x: dragStartRef.current.lastValidX, y: dragStartRef.current.lastValidY };
            setPos(newPos);
            onPositionChange?.(newPos);
            windowRef.current.style.transform = 'none';
            preMaximizeState.current = { ...preMaximizeState.current, ...newPos };
        }
        dragStartRef.current = null;
        forceUpdate({});
    }, [onPositionChange]);

    const handleMouseMoveDrag = useCallback((e) => handleDragMove(e.clientX, e.clientY), [handleDragMove]);
    const handleTouchMoveDrag = useCallback((e) => {
        if (e.cancelable) e.preventDefault();
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }, [handleDragMove]);

    useEffect(() => {
        if (!dragStartRef.current) return;
        const onMouseUp = () => handleDragEnd();
        const onTouchEnd = () => handleDragEnd();
        document.addEventListener('mousemove', handleMouseMoveDrag);
        document.addEventListener('touchmove', handleTouchMoveDrag, { passive: false });
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('touchend', onTouchEnd);
        return () => {
            document.removeEventListener('mousemove', handleMouseMoveDrag);
            document.removeEventListener('touchmove', handleTouchMoveDrag);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('touchend', onTouchEnd);
        };
    }, [handleMouseMoveDrag, handleTouchMoveDrag, handleDragEnd, dragStartRef.current]);

    const startDrag = useCallback((clientX, clientY) => {
        if (isMaximized) return;
        onFocus?.();
        dragStartRef.current = {
            mouseX: clientX,
            mouseY: clientY,
            initialX: posRef.current.x,
            initialY: posRef.current.y,
            lastValidX: posRef.current.x,
            lastValidY: posRef.current.y
        };
        forceUpdate({});
    }, [isMaximized, onFocus]);

    const handleMouseDownHeader = useCallback((e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        startDrag(e.clientX, e.clientY);
    }, [startDrag]);

    const handleTouchStartHeader = useCallback((e) => {
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }, [startDrag]);

    // Resize handlers
    const startResize = useCallback((clientX, clientY, direction) => {
        if (isMaximized || isMinimized) return;
        resizeStartRef.current = {
            mouseX: clientX,
            mouseY: clientY,
            startW: sizeRef.current.width,
            startH: sizeRef.current.height,
            startX: posRef.current.x,
            startY: posRef.current.y,
            lastValidW: sizeRef.current.width,
            lastValidH: sizeRef.current.height,
            direction
        };

        const moveResize = (moveX, moveY) => {
            if (!resizeStartRef.current || !windowRef.current) return;
            const dx = moveX - resizeStartRef.current.mouseX;
            const dy = moveY - resizeStartRef.current.mouseY;
            let newWidth = resizeStartRef.current.startW;
            let newHeight = resizeStartRef.current.startH;

            if (direction === 'e' || direction === 'se') {
                newWidth = Math.max(MIN_WIDTH, resizeStartRef.current.startW + dx);
                newWidth = Math.min(newWidth, window.innerWidth - resizeStartRef.current.startX - MARGIN);
            }
            if (direction === 's' || direction === 'se') {
                newHeight = Math.max(MIN_HEIGHT, resizeStartRef.current.startH + dy);
                newHeight = Math.min(newHeight, window.innerHeight - resizeStartRef.current.startY - MARGIN);
            }

            resizeStartRef.current.lastValidW = newWidth;
            resizeStartRef.current.lastValidH = newHeight;
            windowRef.current.style.width = `${newWidth}px`;
            windowRef.current.style.height = `${newHeight}px`;
        };

        const onMouseMoveResize = (e) => moveResize(e.clientX, e.clientY);
        const onTouchMoveResize = (e) => {
            if (e.cancelable) e.preventDefault();
            moveResize(e.touches[0].clientX, e.touches[0].clientY);
        };
        const endResize = () => {
            if (resizeStartRef.current) {
                const newSize = { width: resizeStartRef.current.lastValidW, height: resizeStartRef.current.lastValidH };
                setSize(newSize);
                onSizeChange?.(newSize);
                preMaximizeState.current = { ...preMaximizeState.current, ...newSize };
            }
            resizeStartRef.current = null;
            document.removeEventListener('mousemove', onMouseMoveResize);
            document.removeEventListener('touchmove', onTouchMoveResize);
            document.removeEventListener('mouseup', endResize);
            document.removeEventListener('touchend', endResize);
        };

        document.addEventListener('mousemove', onMouseMoveResize);
        document.addEventListener('touchmove', onTouchMoveResize, { passive: false });
        document.addEventListener('mouseup', endResize);
        document.addEventListener('touchend', endResize);
    }, [isMaximized, isMinimized, onSizeChange]);

    // Window control handlers with smooth animations
    const handleClose = useCallback((e) => {
        e?.stopPropagation();
        setIsAnimatingOut(true);
        // Wait for animation then close
        setTimeout(() => {
            onClose?.();
        }, 150);
    }, [onClose]);

    // Minimize - toggle minimized state
    const handleMinimize = useCallback((e) => {
        e?.stopPropagation();
        const newValue = !isMinimized;
        setIsMinimized(newValue);
        onMinimizeChange?.(newValue);
        if (!newValue) onFocus?.();
    }, [isMinimized, onMinimizeChange, onFocus]);

    const handleMaximize = useCallback((e) => {
        e?.stopPropagation();

        if (!isMaximized) {
            preMaximizeState.current = { x: pos.x, y: pos.y, width: size.width, height: size.height };
        } else {
            setPos({ x: preMaximizeState.current.x, y: preMaximizeState.current.y });
            setSize({ width: preMaximizeState.current.width, height: preMaximizeState.current.height });
        }

        const newValue = !isMaximized;
        setIsMaximized(newValue);
        onMaximizeChange?.(newValue);
        onFocus?.();
    }, [isMaximized, pos, size, onMaximizeChange, onFocus]);

    // Calculate window style based on state
    const windowStyle = useMemo(() => {
        const baseStyle = { zIndex, display: 'flex' };

        // Minimized state - small bar at bottom
        if (isMinimized) {
            return {
                ...baseStyle,
                position: 'fixed',
                bottom: MARGIN,
                left: '50%',
                transform: 'translateX(-50%)',
                width: isMobile ? 'calc(100% - 32px)' : '320px',
                height: '40px',
                top: 'auto',
                right: 'auto',
                borderRadius: '12px'
            };
        }

        if (isMaximized) {
            return {
                ...baseStyle,
                position: 'fixed',
                top: HEADER_HEIGHT + MARGIN,
                left: MARGIN,
                right: MARGIN,
                bottom: MARGIN,
                width: 'auto',
                height: 'auto'
            };
        }

        if (isMobile) {
            // Mobile "Restored" (not maximized) state
            // Slightly smaller than fullscreen, centered
            return {
                ...baseStyle,
                position: 'fixed',
                top: HEADER_HEIGHT + MARGIN + 20, // A bit lower
                left: MARGIN + 10,
                right: MARGIN + 10,
                bottom: MARGIN + 40,
                width: 'auto',
                height: 'auto'
            };
        }

        // Desktop Windowed mode
        return {
            ...baseStyle,
            position: 'fixed',
            top: pos.y,
            left: pos.x,
            width: size.width,
            height: size.height
        };
    }, [zIndex, isMaximized, isMinimized, isMobile, pos, size]);

    // Animation variants based on platform and state
    const getAnimationProps = () => {
        if (isAnimatingOut) {
            // Exit animation
            return isMobile
                ? { opacity: 0, y: 60, scale: 0.98 }
                : { opacity: 0, scale: 0.95 };
        }

        if (!isMounted) {
            // Initial state before mount
            return isMobile
                ? { opacity: 0, y: 40 }
                : { opacity: 0, scale: 0.95 };
        }

        if (isMinimized) {
            // Minimized state
            return { opacity: 1, y: 0, scale: 1 };
        }

        // Normal visible state
        return { opacity: 1, y: 0, scale: 1 };
    };

    return (
        <motion.div
            ref={windowRef}
            initial={isMobile ? { opacity: 0, y: 50 } : { opacity: 0, scale: 0.9 }}
            animate={getAnimationProps()}
            transition={isAnimatingOut ? { duration: 0.15, ease: [0.4, 0, 1, 1] } : springConfig}
            onMouseDown={onFocus}
            onTouchStart={onFocus}
            className="fixed flex flex-col overflow-hidden outline-none border border-(--border-primary) rounded-lg shadow-lg bg-white will-change-transform"
            style={{ ...windowStyle, transformOrigin: 'center center' }}
            role="dialog"
            aria-labelledby={`window-title-${id}`}
            tabIndex={-1}
        >
            {/* Window Header */}
            <motion.div
                className={`flex items-center justify-between h-[30px] px-2 bg-(--posthog-3000-50) border-b border-(--border-primary) select-none shrink-0 ${!isMaximized ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                onMouseDown={!isMaximized ? handleMouseDownHeader : undefined}
                onTouchStart={!isMaximized ? handleTouchStartHeader : undefined}
                layout
                transition={fastSpring}
            >
                {/* Toolbar area */}
                <div className="flex items-center gap-1 flex-1 min-w-0">{toolbar}</div>

                {/* Window Controls */}
                <div className="flex items-center gap-0.5 shrink-0">
                    <motion.button
                        onClick={handleMinimize}
                        className="p-1.5 rounded hover:bg-black/5 active:bg-black/10 transition-colors text-black"
                        title={isMinimized ? "Restore" : "Minimize to tabs"}
                        whileTap={{ scale: 0.9 }}
                    >
                        <MinimizeIcon />
                    </motion.button>
                    <motion.button
                        onClick={handleMaximize}
                        className="p-1.5 rounded hover:bg-black/5 active:bg-black/10 transition-colors text-black"
                        title={isMaximized ? "Restore" : "Maximize"}
                        whileTap={{ scale: 0.9 }}
                    >
                        {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
                    </motion.button>
                    <motion.button
                        onClick={handleClose}
                        className="p-1.5 rounded hover:bg-red-500/10 active:bg-red-500/20 transition-colors text-black hover:text-red-500"
                        title="Close"
                        whileTap={{ scale: 0.9 }}
                    >
                        <CloseWindowIcon />
                    </motion.button>
                </div>
            </motion.div>

            {/* Window Content */}
            <AnimatePresence>
                {!isMinimized && (
                    <motion.div
                        className="flex-1 flex overflow-hidden bg-white relative"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={fastSpring}
                    >
                        <div className="flex-1 overflow-auto scroll-smooth cursor-default relative">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Resize Handles (only on desktop windowed mode) */}
            <AnimatePresence>
                {!isMaximized && !isMobile && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute top-0 right-0 w-[12px] h-full cursor-e-resize z-20 touch-none"
                            onMouseDown={(e) => { e.preventDefault(); startResize(e.clientX, e.clientY, 'e'); }}
                            onTouchStart={(e) => startResize(e.touches[0].clientX, e.touches[0].clientY, 'e')}
                            aria-hidden="true"
                        />
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute bottom-0 left-0 w-full h-[12px] cursor-s-resize z-20 touch-none"
                            onMouseDown={(e) => { e.preventDefault(); startResize(e.clientX, e.clientY, 's'); }}
                            onTouchStart={(e) => startResize(e.touches[0].clientX, e.touches[0].clientY, 's')}
                            aria-hidden="true"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="absolute bottom-0 right-0 w-[16px] h-[16px] cursor-se-resize bg-(--posthog-3000-200) hover:bg-blue-500 rounded-tl-md z-30 touch-none"
                            onMouseDown={(e) => { e.preventDefault(); startResize(e.clientX, e.clientY, 'se'); }}
                            onTouchStart={(e) => startResize(e.touches[0].clientX, e.touches[0].clientY, 'se')}
                            aria-hidden="true"
                        />
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default React.memo(Window);
