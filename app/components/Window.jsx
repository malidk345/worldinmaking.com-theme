'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MinimizeIcon, MaximizeIcon, RestoreIcon, CloseWindowIcon } from './WindowIcons';

/**
 * Window Component - Desktop-like Window Management
 * 
 * Features:
 * - Mobile: Opens maximized, stays maximized
 * - Desktop: Opens centered at specified size, can be resized/moved
 * - Maximize respects 8px margin and header height
 * - Smooth animations for all state changes
 */

const HEADER_HEIGHT = 45;
const MARGIN = 8;
const MOBILE_BREAKPOINT = 768;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 200;
const DEFAULT_WIDTH = 700;
const DEFAULT_HEIGHT = 500;

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
    const [isClosing, setIsClosing] = useState(false);

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

        if (!mobile) {
            // Desktop: Calculate centered position
            const viewWidth = window.innerWidth;
            const viewHeight = window.innerHeight;
            const maxWidth = viewWidth - MARGIN * 2;
            const maxHeight = viewHeight - HEADER_HEIGHT - MARGIN * 2;

            const windowWidth = Math.min(initialWidth, maxWidth);
            const windowHeight = Math.min(initialHeight, maxHeight);

            const centeredX = initialX ?? Math.max(MARGIN, (viewWidth - windowWidth) / 2);
            const centeredY = initialY ?? Math.max(HEADER_HEIGHT + MARGIN, (viewHeight - windowHeight) / 2);

            setPos({ x: centeredX, y: centeredY });
            setSize({ width: windowWidth, height: windowHeight });
            preMaximizeState.current = { x: centeredX, y: centeredY, width: windowWidth, height: windowHeight };

            // Desktop: Start not maximized unless explicitly set
            if (!isMaximizedProp) {
                setIsMaximized(false);
            }
        } else {
            // Mobile: Always start maximized
            setIsMaximized(true);
        }

        setIsMounted(true);
    }, []);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < MOBILE_BREAKPOINT;
            setIsMobile(mobile);
            if (mobile && !isMaximized) {
                setIsMaximized(true);
                onMaximizeChange?.(true);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isMaximized, onMaximizeChange]);

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

        // Constrain to viewport
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
        if (isMaximized || isMobile) return;
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
    }, [isMaximized, isMobile, onFocus]);

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
        if (isMaximized || isMinimized || isMobile) return;
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
    }, [isMaximized, isMinimized, isMobile, onSizeChange]);

    // Window control handlers
    const handleClose = useCallback((e) => {
        e?.stopPropagation();
        setIsClosing(true);
        setTimeout(() => onClose?.(), 200);
    }, [onClose]);

    const handleMaximize = useCallback((e) => {
        e?.stopPropagation();
        if (isMobile) return; // Mobile always stays maximized

        if (!isMaximized) {
            // Store current state before maximizing
            preMaximizeState.current = { x: pos.x, y: pos.y, width: size.width, height: size.height };
        } else {
            // Restore previous state
            setPos({ x: preMaximizeState.current.x, y: preMaximizeState.current.y });
            setSize({ width: preMaximizeState.current.width, height: preMaximizeState.current.height });
        }

        const newValue = !isMaximized;
        setIsMaximized(newValue);
        setIsMinimized(false);
        onMaximizeChange?.(newValue);
        onMinimizeChange?.(false);
        onFocus?.();
    }, [isMaximized, isMobile, pos, size, onMaximizeChange, onMinimizeChange, onFocus]);

    const handleMinimize = useCallback((e) => {
        e?.stopPropagation();
        const newValue = !isMinimized;
        setIsMinimized(newValue);
        onMinimizeChange?.(newValue);
        if (!newValue) onFocus?.();
    }, [isMinimized, onMinimizeChange, onFocus]);

    // Calculate window style based on state
    const windowStyle = useMemo(() => {
        const baseStyle = { zIndex, display: 'flex' };

        if (!isMounted) {
            return { ...baseStyle, opacity: 0, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
        }

        if (isMinimized) {
            // Minimized: Small bar at bottom
            return {
                ...baseStyle,
                position: 'fixed',
                bottom: MARGIN,
                left: '50%',
                transform: 'translateX(-50%)',
                width: isMobile ? '90%' : '280px',
                height: '30px',
                top: 'auto'
            };
        }

        if (isMaximized || isMobile) {
            // Maximized: Fill viewport with margins
            return {
                ...baseStyle,
                position: 'fixed',
                top: HEADER_HEIGHT + MARGIN,
                left: MARGIN,
                width: `calc(100vw - ${MARGIN * 2}px)`,
                height: `calc(100dvh - ${HEADER_HEIGHT + MARGIN * 2}px - env(safe-area-inset-bottom))`
            };
        }

        // Windowed mode
        return {
            ...baseStyle,
            position: 'fixed',
            top: pos.y,
            left: pos.x,
            width: size.width,
            height: size.height
        };
    }, [zIndex, isMounted, isMaximized, isMinimized, isMobile, pos, size]);

    // Animation variants
    const variants = {
        hidden: {
            opacity: 0,
            scale: isMobile ? 1 : 0.95,
            y: isMobile ? 50 : 0
        },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                type: 'spring',
                stiffness: 400,
                damping: 30,
                mass: 0.8
            }
        },
        minimized: {
            opacity: 1,
            scale: 1,
            transition: {
                type: 'spring',
                stiffness: 400,
                damping: 30
            }
        },
        exit: {
            opacity: 0,
            scale: isMobile ? 1 : 0.95,
            y: isMobile ? 100 : 0,
            transition: {
                duration: 0.15,
                ease: 'easeOut'
            }
        }
    };

    return (
        <motion.div
            ref={windowRef}
            initial="hidden"
            animate={isClosing ? "exit" : (isMinimized ? "minimized" : "visible")}
            exit="exit"
            variants={variants}
            layout
            layoutId={id}
            onMouseDown={onFocus}
            onTouchStart={onFocus}
            className="fixed flex flex-col overflow-hidden outline-none border border-(--border-primary) rounded-lg shadow-lg bg-white"
            style={{ ...windowStyle, transformOrigin: 'center center' }}
            role="dialog"
            aria-labelledby={`window-title-${id}`}
            tabIndex={-1}
        >
            {/* Window Header - Original styling */}
            <div
                className={`flex items-center justify-between h-[30px] px-2 bg-(--posthog-3000-50) border-b border-(--border-primary) cursor-default select-none shrink-0`}
                onMouseDown={!isMaximized && !isMobile ? handleMouseDownHeader : undefined}
                onTouchStart={!isMaximized && !isMobile ? handleTouchStartHeader : undefined}
            >
                {/* Toolbar area - same as before */}
                <div className="flex items-center gap-1 flex-1 min-w-0">{toolbar}</div>

                {/* Window Controls - Original styling */}
                <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={handleMinimize} className="p-1.5 rounded hover:bg-black/5 transition-colors text-black">
                        <MinimizeIcon />
                    </button>
                    <button onClick={handleMaximize} className="p-1.5 rounded hover:bg-black/5 transition-colors text-black">
                        {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
                    </button>
                    <button onClick={handleClose} className="p-1.5 rounded hover:bg-red-500/10 transition-colors text-black hover:text-red-500">
                        <CloseWindowIcon />
                    </button>
                </div>
            </div>

            {/* Window Content */}
            {!isMinimized && (
                <div className="flex-1 flex overflow-hidden bg-white relative h-full">
                    <div className="flex-1 overflow-auto h-full scroll-smooth cursor-default relative">
                        {children}
                    </div>
                </div>
            )}

            {/* Resize Handles - Original styling (only on desktop windowed mode) */}
            {!isMaximized && !isMinimized && !isMobile && (
                <>
                    <div
                        className="absolute top-0 right-0 w-[12px] h-full cursor-e-resize z-20 touch-none"
                        onMouseDown={(e) => { e.preventDefault(); startResize(e.clientX, e.clientY, 'e'); }}
                        onTouchStart={(e) => startResize(e.touches[0].clientX, e.touches[0].clientY, 'e')}
                        aria-hidden="true"
                    />
                    <div
                        className="absolute bottom-0 left-0 w-full h-[12px] cursor-s-resize z-20 touch-none"
                        onMouseDown={(e) => { e.preventDefault(); startResize(e.clientX, e.clientY, 's'); }}
                        onTouchStart={(e) => startResize(e.touches[0].clientX, e.touches[0].clientY, 's')}
                        aria-hidden="true"
                    />
                    <div
                        className="absolute bottom-0 right-0 w-[16px] h-[16px] cursor-se-resize bg-(--posthog-3000-200) hover:bg-blue-500 rounded-tl-md z-30 touch-none"
                        onMouseDown={(e) => { e.preventDefault(); startResize(e.clientX, e.clientY, 'se'); }}
                        onTouchStart={(e) => startResize(e.touches[0].clientX, e.touches[0].clientY, 'se')}
                        aria-hidden="true"
                    />
                </>
            )}
        </motion.div>
    );
};

export default React.memo(Window);
