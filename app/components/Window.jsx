'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MinimizeIcon, MaximizeIcon, RestoreIcon, CloseWindowIcon } from './WindowIcons';

/**
 * Window Component
 * A draggable, resizable window container with PostHog-next styling
 * 
 * Requirements:
 * - Toolbar replaces title bar (icons on left, window controls on right)
 * - Windows have 8px padding from header edges and bottom when maximized
 * - Maintains PostHog aesthetic
 */

const HEADER_HEIGHT = 45; // --scene-layout-header-height
const MARGIN = 8; // 8px from edges when maximized
const MOBILE_BREAKPOINT = 768;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 200;

const Window = ({
    id,
    title,
    children,
    toolbar, // Custom toolbar content (icons on the left)
    onClose,
    onFocus,
    zIndex = 10,
    isMaximized: isMaximizedProp = true,
    isMinimized: isMinimizedProp = false,
    initialX = 100,
    initialY = 100,
    initialWidth = 700,
    initialHeight = 500,
    onMaximizeChange,
    onMinimizeChange,
    onPositionChange,
    onSizeChange
}) => {
    // State
    const [pos, setPos] = useState({ x: initialX, y: initialY });
    const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
    const [isMaximized, setIsMaximized] = useState(isMaximizedProp);
    const [isMinimized, setIsMinimized] = useState(isMinimizedProp);
    const [isMounted, setIsMounted] = useState(false);

    // Refs
    const windowRef = useRef(null);
    const posRef = useRef(pos);
    const sizeRef = useRef(size);
    const dragStartRef = useRef(null);
    const resizeStartRef = useRef(null);

    // Keep refs in sync
    useEffect(() => { posRef.current = pos; }, [pos]);
    useEffect(() => { sizeRef.current = size; }, [size]);

    // Client-side mount detection
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Sync with props
    useEffect(() => { setIsMaximized(isMaximizedProp); }, [isMaximizedProp]);
    useEffect(() => { setIsMinimized(isMinimizedProp); }, [isMinimizedProp]);

    // Auto-maximize on mobile
    useEffect(() => {
        if (!isMounted) return;

        const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
        if (isMobile && !isMaximized) {
            setIsMaximized(true);
            onMaximizeChange?.(true);
        }
    }, [isMounted, isMaximized, onMaximizeChange]);

    // Drag handlers
    const handleDragMove = useCallback((clientX, clientY) => {
        if (!dragStartRef.current || !windowRef.current) return;

        const dx = clientX - dragStartRef.current.mouseX;
        const dy = clientY - dragStartRef.current.mouseY;

        let newX = dragStartRef.current.initialX + dx;
        let newY = dragStartRef.current.initialY + dy;

        // Constrain to viewport
        newX = Math.max(MARGIN, newX);
        newY = Math.max(HEADER_HEIGHT + MARGIN, newY);

        const maxX = window.innerWidth - sizeRef.current.width - MARGIN;
        newX = Math.min(newX, maxX);

        const maxY = window.innerHeight - sizeRef.current.height - MARGIN;
        newY = Math.min(newY, maxY);

        dragStartRef.current.lastValidX = newX;
        dragStartRef.current.lastValidY = newY;

        const effectiveDeltaX = newX - dragStartRef.current.initialX;
        const effectiveDeltaY = newY - dragStartRef.current.initialY;

        windowRef.current.style.transform = `translate3d(${effectiveDeltaX}px, ${effectiveDeltaY}px, 0)`;
    }, []);

    const handleDragEnd = useCallback(() => {
        if (dragStartRef.current && windowRef.current) {
            const newPos = {
                x: dragStartRef.current.lastValidX,
                y: dragStartRef.current.lastValidY
            };
            setPos(newPos);
            onPositionChange?.(newPos);
            windowRef.current.style.transform = 'none';
        }
        dragStartRef.current = null;
    }, [onPositionChange]);

    const handleMouseMoveDrag = useCallback((e) => {
        handleDragMove(e.clientX, e.clientY);
    }, [handleDragMove]);

    const handleTouchMoveDrag = useCallback((e) => {
        e.preventDefault();
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }, [handleDragMove]);

    // Setup and cleanup drag listeners
    useEffect(() => {
        const onMouseUp = () => handleDragEnd();
        const onTouchEnd = () => handleDragEnd();

        if (dragStartRef.current) {
            document.addEventListener('mousemove', handleMouseMoveDrag);
            document.addEventListener('touchmove', handleTouchMoveDrag, { passive: false });
            document.addEventListener('mouseup', onMouseUp);
            document.addEventListener('touchend', onTouchEnd);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMoveDrag);
            document.removeEventListener('touchmove', handleTouchMoveDrag);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('touchend', onTouchEnd);
        };
    }, [handleMouseMoveDrag, handleTouchMoveDrag, handleDragEnd]);

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

        // Force re-render to attach listeners
        document.addEventListener('mousemove', handleMouseMoveDrag);
        document.addEventListener('touchmove', handleTouchMoveDrag, { passive: false });
        document.addEventListener('mouseup', handleDragEnd);
        document.addEventListener('touchend', handleDragEnd);
    }, [isMaximized, onFocus, handleMouseMoveDrag, handleTouchMoveDrag, handleDragEnd]);

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

            if (resizeStartRef.current.direction === 'e' || resizeStartRef.current.direction === 'se') {
                newWidth = Math.max(MIN_WIDTH, resizeStartRef.current.startW + dx);
                const maxWidth = window.innerWidth - resizeStartRef.current.startX - MARGIN;
                newWidth = Math.min(newWidth, maxWidth);
            }
            if (resizeStartRef.current.direction === 's' || resizeStartRef.current.direction === 'se') {
                newHeight = Math.max(MIN_HEIGHT, resizeStartRef.current.startH + dy);
                const maxHeight = window.innerHeight - resizeStartRef.current.startY - MARGIN;
                newHeight = Math.min(newHeight, maxHeight);
            }

            resizeStartRef.current.lastValidW = newWidth;
            resizeStartRef.current.lastValidH = newHeight;

            windowRef.current.style.width = `${newWidth}px`;
            windowRef.current.style.height = `${newHeight}px`;
        };

        const onMouseMoveResize = (e) => moveResize(e.clientX, e.clientY);
        const onTouchMoveResize = (e) => {
            e.preventDefault();
            moveResize(e.touches[0].clientX, e.touches[0].clientY);
        };

        const endResize = () => {
            if (resizeStartRef.current) {
                const newSize = {
                    width: resizeStartRef.current.lastValidW,
                    height: resizeStartRef.current.lastValidH
                };
                setSize(newSize);
                onSizeChange?.(newSize);
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

    // Window control handlers
    const handleClose = useCallback((e) => {
        e?.stopPropagation();
        onClose?.();
    }, [onClose]);

    const handleMaximize = useCallback((e) => {
        e?.stopPropagation();
        const newValue = !isMaximized;
        setIsMaximized(newValue);
        setIsMinimized(false);
        onMaximizeChange?.(newValue);
        onMinimizeChange?.(false);
        onFocus?.();
    }, [isMaximized, onMaximizeChange, onMinimizeChange, onFocus]);

    const handleMinimize = useCallback((e) => {
        e?.stopPropagation();
        const newValue = !isMinimized;
        setIsMinimized(newValue);
        onMinimizeChange?.(newValue);
    }, [isMinimized, onMinimizeChange]);

    // Calculate window style based on state
    const getWindowStyle = useCallback(() => {
        const baseStyle = {
            zIndex,
            display: 'flex'
        };

        if (!isMounted) {
            // Return a safe default for SSR
            return {
                ...baseStyle,
                top: HEADER_HEIGHT + MARGIN,
                left: MARGIN,
                width: '100%',
                height: '100%',
                opacity: 0
            };
        }

        if (isMaximized) {
            if (isMinimized) {
                return {
                    ...baseStyle,
                    top: window.innerHeight - 50,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '90%',
                    height: '30px'
                };
            }
            // Maximized state with 8px padding from edges
            return {
                ...baseStyle,
                top: HEADER_HEIGHT + MARGIN,
                left: MARGIN,
                width: `calc(100vw - ${MARGIN * 2}px)`,
                height: `calc(100dvh - ${HEADER_HEIGHT + MARGIN * 2}px - env(safe-area-inset-bottom))`
            };
        }

        if (isMinimized) {
            return {
                ...baseStyle,
                top: pos.y,
                left: pos.x,
                width: size.width,
                height: 30
            };
        }

        return {
            ...baseStyle,
            top: pos.y,
            left: pos.x,
            width: size.width,
            height: size.height
        };
    }, [zIndex, isMounted, isMaximized, isMinimized, pos, size]);

    const style = getWindowStyle();

    return (
        <motion.div
            ref={windowRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
                mass: 0.8
            }}
            onMouseDown={onFocus}
            onTouchStart={onFocus}
            className="fixed flex flex-col overflow-hidden outline-none border border-(--border-primary) rounded-lg shadow-lg bg-white"
            style={{ ...style, transformOrigin: 'center center' }}
            role="dialog"
            aria-labelledby={`window-title-${id}`}
            tabIndex={-1}
        >
            {/* Window Toolbar/Title Bar */}
            <div
                className="flex items-center justify-between h-[30px] px-2 bg-(--posthog-3000-50) border-b border-(--border-primary) cursor-default select-none shrink-0"
                onMouseDown={!isMaximized ? handleMouseDownHeader : undefined}
                onTouchStart={!isMaximized ? handleTouchStartHeader : undefined}
            >
                {/* Left side - Custom toolbar icons */}
                <div className="flex items-center gap-1 flex-1 min-w-0">
                    {toolbar}
                </div>

                {/* Right side - Window controls */}
                <div className="flex items-center gap-0.5 shrink-0">
                    <button
                        onClick={handleMinimize}
                        className="p-1.5 rounded hover:bg-black/5 transition-colors text-black"
                        title="Minimize"
                        aria-label="Minimize window"
                    >
                        <MinimizeIcon />
                    </button>
                    <button
                        onClick={handleMaximize}
                        className="p-1.5 rounded hover:bg-black/5 transition-colors text-black"
                        title={isMaximized ? "Restore" : "Maximize"}
                        aria-label={isMaximized ? "Restore window" : "Maximize window"}
                    >
                        {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
                    </button>
                    <button
                        onClick={handleClose}
                        className="p-1.5 rounded hover:bg-red-500/10 transition-colors text-black hover:text-red-500"
                        title="Close"
                        aria-label="Close window"
                    >
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

            {/* Resize handles - only when not maximized */}
            {!isMaximized && !isMinimized && (
                <>
                    <div
                        className="absolute top-0 right-0 w-[12px] h-full cursor-e-resize z-20 touch-none"
                        onMouseDown={(e) => { e.preventDefault(); startResize(e.clientX, e.clientY, 'e'); }}
                        onTouchStart={(e) => { startResize(e.touches[0].clientX, e.touches[0].clientY, 'e'); }}
                        aria-hidden="true"
                    />
                    <div
                        className="absolute bottom-0 left-0 w-full h-[12px] cursor-s-resize z-20 touch-none"
                        onMouseDown={(e) => { e.preventDefault(); startResize(e.clientX, e.clientY, 's'); }}
                        onTouchStart={(e) => { startResize(e.touches[0].clientX, e.touches[0].clientY, 's'); }}
                        aria-hidden="true"
                    />
                    <div
                        className="absolute bottom-0 right-0 w-[16px] h-[16px] cursor-se-resize bg-(--posthog-3000-200) hover:bg-blue-500 rounded-tl-md z-30 touch-none"
                        onMouseDown={(e) => { e.preventDefault(); startResize(e.clientX, e.clientY, 'se'); }}
                        onTouchStart={(e) => { startResize(e.touches[0].clientX, e.touches[0].clientY, 'se'); }}
                        aria-hidden="true"
                    />
                </>
            )}
        </motion.div>
    );
};

export default React.memo(Window);
