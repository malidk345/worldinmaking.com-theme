'use client';

import React, { useState, useEffect, useRef } from 'react';
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

    // Refs
    const windowRef = useRef(null);
    const posRef = useRef(pos);
    const sizeRef = useRef(size);

    useEffect(() => { posRef.current = pos; }, [pos]);
    useEffect(() => { sizeRef.current = size; }, [size]);

    // Sync with props
    useEffect(() => { setIsMaximized(isMaximizedProp); }, [isMaximizedProp]);
    useEffect(() => { setIsMinimized(isMinimizedProp); }, [isMinimizedProp]);

    // Auto-maximize on mobile
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
            if (isMobile && !isMaximized) {
                setIsMaximized(true);
                onMaximizeChange?.(true);
            }
        }
    }, []);

    // Drag handling
    const dragStart = useRef(null);

    const startDrag = (clientX, clientY) => {
        if (isMaximized) return;
        onFocus?.();

        dragStart.current = {
            mouseX: clientX,
            mouseY: clientY,
            initialX: posRef.current.x,
            initialY: posRef.current.y,
            lastValidX: posRef.current.x,
            lastValidY: posRef.current.y
        };

        document.addEventListener('mousemove', onMouseMoveDrag);
        document.addEventListener('touchmove', onTouchMoveDrag, { passive: false });
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);
    };

    const moveDrag = (clientX, clientY) => {
        if (!dragStart.current || !windowRef.current) return;

        const dx = clientX - dragStart.current.mouseX;
        const dy = clientY - dragStart.current.mouseY;

        let newX = dragStart.current.initialX + dx;
        let newY = dragStart.current.initialY + dy;

        newX = Math.max(MARGIN, newX);
        newY = Math.max(HEADER_HEIGHT + MARGIN, newY);

        const maxX = window.innerWidth - sizeRef.current.width - MARGIN;
        newX = Math.min(newX, maxX);

        const maxY = window.innerHeight - sizeRef.current.height - MARGIN;
        newY = Math.min(newY, maxY);

        dragStart.current.lastValidX = newX;
        dragStart.current.lastValidY = newY;

        const effectiveDeltaX = newX - dragStart.current.initialX;
        const effectiveDeltaY = newY - dragStart.current.initialY;

        windowRef.current.style.transform = `translate3d(${effectiveDeltaX}px, ${effectiveDeltaY}px, 0)`;
    };

    const onMouseMoveDrag = (e) => moveDrag(e.clientX, e.clientY);
    const onTouchMoveDrag = (e) => {
        e.preventDefault();
        moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    };

    const endDrag = () => {
        if (dragStart.current && windowRef.current) {
            const newPos = {
                x: dragStart.current.lastValidX,
                y: dragStart.current.lastValidY
            };
            setPos(newPos);
            onPositionChange?.(newPos);
            windowRef.current.style.transform = 'none';
        }

        dragStart.current = null;
        document.removeEventListener('mousemove', onMouseMoveDrag);
        document.removeEventListener('touchmove', onTouchMoveDrag);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchend', endDrag);
    };

    const handleMouseDownHeader = (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        startDrag(e.clientX, e.clientY);
    };

    const handleTouchStartHeader = (e) => {
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
    };

    // Resize handling
    const resizeStart = useRef(null);

    const startResize = (clientX, clientY, direction) => {
        if (isMaximized || isMinimized) return;

        resizeStart.current = {
            mouseX: clientX,
            mouseY: clientY,
            startW: sizeRef.current.width,
            startH: sizeRef.current.height,
            startX: posRef.current.x,
            startY: posRef.current.y,
            lastValidW: sizeRef.current.width,
            lastValidH: sizeRef.current.height
        };

        const moveResize = (moveX, moveY) => {
            if (!resizeStart.current || !windowRef.current) return;

            const dx = moveX - resizeStart.current.mouseX;
            const dy = moveY - resizeStart.current.mouseY;

            let newWidth = resizeStart.current.startW;
            let newHeight = resizeStart.current.startH;

            if (direction === 'e' || direction === 'se') {
                newWidth = Math.max(320, resizeStart.current.startW + dx);
                const maxWidth = window.innerWidth - resizeStart.current.startX - MARGIN;
                newWidth = Math.min(newWidth, maxWidth);
            }
            if (direction === 's' || direction === 'se') {
                newHeight = Math.max(200, resizeStart.current.startH + dy);
                const maxHeight = window.innerHeight - resizeStart.current.startY - MARGIN;
                newHeight = Math.min(newHeight, maxHeight);
            }

            resizeStart.current.lastValidW = newWidth;
            resizeStart.current.lastValidH = newHeight;

            windowRef.current.style.width = `${newWidth}px`;
            windowRef.current.style.height = `${newHeight}px`;
        };

        const onMouseMoveResize = (e) => moveResize(e.clientX, e.clientY);
        const onTouchMoveResize = (e) => {
            e.preventDefault();
            moveResize(e.touches[0].clientX, e.touches[0].clientY);
        };

        const endResize = () => {
            if (resizeStart.current) {
                const newSize = {
                    width: resizeStart.current.lastValidW,
                    height: resizeStart.current.lastValidH
                };
                setSize(newSize);
                onSizeChange?.(newSize);
            }

            resizeStart.current = null;
            document.removeEventListener('mousemove', onMouseMoveResize);
            document.removeEventListener('touchmove', onTouchMoveResize);
            document.removeEventListener('mouseup', endResize);
            document.removeEventListener('touchend', endResize);
        };

        document.addEventListener('mousemove', onMouseMoveResize);
        document.addEventListener('touchmove', onTouchMoveResize, { passive: false });
        document.addEventListener('mouseup', endResize);
        document.addEventListener('touchend', endResize);
    };

    // Window control handlers
    const handleClose = (e) => {
        e?.stopPropagation();
        onClose?.();
    };

    const handleMaximize = (e) => {
        e?.stopPropagation();
        const newValue = !isMaximized;
        setIsMaximized(newValue);
        setIsMinimized(false);
        onMaximizeChange?.(newValue);
        onMinimizeChange?.(false);
        onFocus?.();
    };

    const handleMinimize = (e) => {
        e?.stopPropagation();
        const newValue = !isMinimized;
        setIsMinimized(newValue);
        onMinimizeChange?.(newValue);
    };

    // Calculate window style based on state
    let style = {
        zIndex,
        display: 'flex'
    };

    if (isMaximized) {
        if (isMinimized) {
            style = {
                ...style,
                top: typeof window !== 'undefined' ? window.innerHeight - 50 : 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '90%',
                height: '30px'
            };
        } else {
            // Maximized state with 8px padding from edges
            style = {
                ...style,
                top: HEADER_HEIGHT + MARGIN,
                left: MARGIN,
                width: `calc(100vw - ${MARGIN * 2}px)`,
                height: `calc(100dvh - ${HEADER_HEIGHT + MARGIN * 2}px - env(safe-area-inset-bottom))`
            };
        }
    } else {
        if (isMinimized) {
            style = {
                ...style,
                top: pos.y,
                left: pos.x,
                width: size.width,
                height: 30
            };
        } else {
            style = {
                ...style,
                top: pos.y,
                left: pos.x,
                width: size.width,
                height: size.height,
            };
        }
    }

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
                    >
                        <MinimizeIcon />
                    </button>
                    <button
                        onClick={handleMaximize}
                        className="p-1.5 rounded hover:bg-black/5 transition-colors text-black"
                        title={isMaximized ? "Restore" : "Maximize"}
                    >
                        {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
                    </button>
                    <button
                        onClick={handleClose}
                        className="p-1.5 rounded hover:bg-red-500/10 transition-colors text-black hover:text-red-500"
                        title="Close"
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
                    />
                    <div
                        className="absolute bottom-0 left-0 w-full h-[12px] cursor-s-resize z-20 touch-none"
                        onMouseDown={(e) => { e.preventDefault(); startResize(e.clientX, e.clientY, 's'); }}
                        onTouchStart={(e) => { startResize(e.touches[0].clientX, e.touches[0].clientY, 's'); }}
                    />
                    <div
                        className="absolute bottom-0 right-0 w-[16px] h-[16px] cursor-se-resize bg-(--posthog-3000-200) hover:bg-blue-500 rounded-tl-md z-30 touch-none"
                        onMouseDown={(e) => { e.preventDefault(); startResize(e.clientX, e.clientY, 'se'); }}
                        onTouchStart={(e) => { startResize(e.touches[0].clientX, e.touches[0].clientY, 'se'); }}
                    />
                </>
            )}
        </motion.div>
    );
};

export default React.memo(Window);
