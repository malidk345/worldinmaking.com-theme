'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MinimizeIcon, MaximizeIcon, RestoreIcon, CloseWindowIcon } from './WindowIcons';
import { useWindowInteraction } from '../hooks/useWindowInteraction';

/**
 * Window Component with Premium Visuals and Refactored Logic
 */

const HEADER_HEIGHT = 45;
const MARGIN = 4;
const MOBILE_BREAKPOINT = 768;
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

// Premium Desktop Spring: Buttery Smooth with Quick Response
const premiumSpring = {
    type: 'spring',
    stiffness: 350,
    damping: 35,
    mass: 0.8
};

// Synced spring for layout transitions (maximize/minimize)
const layoutSpring = {
    type: 'spring',
    stiffness: 400,
    damping: 40,
    mass: 0.7
};

const Window = ({
    id,
    title,
    children,
    toolbar,
    onClose,
    onFocus,
    zIndex = 10,
    isFocused = false,
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
    const [isMounted, setIsMounted] = useState(false);
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);

    // Window states
    const [isMaximized, setIsMaximized] = useState(isMaximizedProp);
    const [isMinimized, setIsMinimized] = useState(isMinimizedProp);

    // Position and size for windowed mode
    const [pos, setPos] = useState({ x: initialX ?? 0, y: initialY ?? 0 });
    const [size, setSize] = useState({ width: initialWidth, height: initialHeight });

    const windowRef = useRef(null);
    const posRef = useRef(pos);
    const sizeRef = useRef(size);
    const preMaximizeState = useRef({ x: 0, y: 0, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });

    // Sync refs
    useEffect(() => { posRef.current = pos; }, [pos]);
    useEffect(() => { sizeRef.current = size; }, [size]);

    // Initialize position
    useEffect(() => {
        const mobile = window.innerWidth < MOBILE_BREAKPOINT;

        const viewWidth = window.innerWidth;
        const viewHeight = window.innerHeight;

        const startW = Math.floor(mobile ? viewWidth - (MARGIN * 2) : initialWidth);
        const startH = Math.floor(mobile ? viewHeight - (HEADER_HEIGHT + MARGIN * 2) : initialHeight);
        const centeredX = Math.floor(initialX ?? Math.max(MARGIN, (viewWidth - startW) / 2));
        const centeredY = Math.floor(initialY ?? Math.max(HEADER_HEIGHT + MARGIN, (viewHeight - startH) / 2));

        setPos({ x: centeredX, y: centeredY });
        setSize({ width: startW, height: startH });
        preMaximizeState.current = { x: centeredX, y: centeredY, width: startW, height: startH };

        if (mobile) setIsMaximized(true);
        else setIsMaximized(isMaximizedProp);

        requestAnimationFrame(() => setIsMounted(true));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Intentionally empty - initialization only runs once on mount

    // Interaction Hook
    const {
        startDrag,
        handleDragMove,
        handleDragEnd,
        startResize,
        handleResizeMove,
        handleResizeEnd,
        isDragging,
        isResizing
    } = useWindowInteraction({
        windowRef, posRef, sizeRef, setPos, setSize,
        onPositionChange, onSizeChange, onFocus,
        isMaximized, isMinimized, preMaximizeState
    });

    // Global Listeners for Interaction
    useEffect(() => {
        if (!isDragging && !isResizing) return;

        const onMove = (e) => {
            const cx = e.touches ? e.touches[0].clientX : e.clientX;
            const cy = e.touches ? e.touches[0].clientY : e.clientY;
            if (isDragging) handleDragMove(cx, cy);
            if (isResizing) handleResizeMove(cx, cy);
        };

        const onEnd = () => {
            if (isDragging) handleDragEnd();
            if (isResizing) handleResizeEnd();
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchend', onEnd);

        return () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchend', onEnd);
        };
    }, [isDragging, isResizing, handleDragMove, handleDragEnd, handleResizeMove, handleResizeEnd]);

    // Sync external props
    useEffect(() => { setIsMaximized(isMaximizedProp); }, [isMaximizedProp]);
    useEffect(() => { setIsMinimized(isMinimizedProp); }, [isMinimizedProp]);

    const handleClose = useCallback((e) => {
        e?.preventDefault();
        e?.stopPropagation();

        // Guard: prevent multiple close calls
        if (isAnimatingOut) return;

        setIsAnimatingOut(true);
        // onClose will be called via onAnimationComplete
    }, [isAnimatingOut]);

    // Handle animation completion - triggers actual close
    const handleAnimationComplete = useCallback(() => {
        if (isAnimatingOut) {
            onClose?.();
        }
    }, [isAnimatingOut, onClose]);

    const handleMinimize = useCallback((e) => {
        e?.stopPropagation();
        const newValue = !isMinimized;
        setIsMinimized(newValue);
        onMinimizeChange?.(newValue);
        if (!newValue) onFocus?.();
    }, [isMinimized, onMinimizeChange, onFocus]);

    const handleMaximize = useCallback((e) => {
        e?.stopPropagation();
        const mobile = window.innerWidth < MOBILE_BREAKPOINT;

        if (!isMaximized) {
            preMaximizeState.current = { x: pos.x, y: pos.y, width: size.width, height: size.height };
        } else {
            if (mobile) {
                // On mobile, force center the window when restoring
                const viewWidth = window.innerWidth;
                const viewHeight = window.innerHeight;
                // Target width: 92% of screen to look good, but not wider than initial
                const targetW = Math.min(initialWidth, viewWidth - (MARGIN * 2));
                const targetH = Math.min(initialHeight, viewHeight - (HEADER_HEIGHT + MARGIN * 2));
                const targetX = (viewWidth - targetW) / 2;
                const targetY = (viewHeight - targetH) / 2 + (HEADER_HEIGHT / 2);

                setPos({ x: Math.floor(targetX), y: Math.floor(targetY) });
                setSize({ width: Math.floor(targetW), height: Math.floor(targetH) });
            } else {
                setPos({ x: preMaximizeState.current.x, y: preMaximizeState.current.y });
                setSize({ width: preMaximizeState.current.width, height: preMaximizeState.current.height });
            }
        }
        const newValue = !isMaximized;
        setIsMaximized(newValue);
        onMaximizeChange?.(newValue);
        onFocus?.();
    }, [isMaximized, pos, size, onMaximizeChange, onFocus, initialWidth, initialHeight]);

    const windowStyle = useMemo(() => {
        const base = { zIndex, transformOrigin: 'center center' };
        if (isMaximized) {
            return { ...base, position: 'fixed', top: HEADER_HEIGHT + MARGIN, left: MARGIN, right: MARGIN, bottom: MARGIN, width: 'auto', height: 'auto' };
        }
        return { ...base, position: 'fixed', top: pos.y, left: pos.x, width: size.width, height: size.height };
    }, [zIndex, isMaximized, isMinimized, pos, size]);

    const getAnimationProps = () => {
        if (isAnimatingOut) return { opacity: 0, scale: 0.9, x: 0, y: 0, transition: { duration: 0.2, ease: 'easeOut' } };
        if (!isMounted) return { opacity: 0, scale: 0.95, x: 0, y: 10 };
        if (isMinimized) {
            const targetX = 50 - (pos.x + size.width / 2);
            const targetY = 15 - (pos.y + size.height / 2);
            return { opacity: 0, scale: 0.1, x: targetX, y: targetY, pointerEvents: 'none' };
        }

        // Solid, fully opaque windows - reset all transform values
        return {
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            pointerEvents: 'auto'
        };
    };

    return (
        <motion.div
            ref={windowRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={getAnimationProps()}
            transition={premiumSpring}
            onAnimationComplete={handleAnimationComplete}
            onMouseDown={onFocus}
            onTouchStart={onFocus}
            layout="position"
            className={`fixed flex flex-col overflow-hidden outline-none rounded-md bg-white will-change-transform border border-(--border-primary) ${isFocused ? 'shadow-lg' : 'shadow-md'}`}
            style={windowStyle}
        >
            {/* Window Header */}
            <motion.div
                className={`flex items-center justify-between h-[30px] px-2 border-b border-(--border-primary) select-none shrink-0 transition-colors duration-300 ${isFocused ? 'bg-(--posthog-3000-100)' : 'bg-(--posthog-3000-50)'
                    } ${!isMaximized ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); }}
                onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
                layout="position"
                transition={layoutSpring}
            >
                <div className={`flex items-center gap-1 flex-1 min-w-0 transition-opacity duration-300 ${isFocused ? 'opacity-100' : 'opacity-60'}`}>
                    {toolbar}
                </div>

                <div className="flex items-center gap-0.5 shrink-0 h-full">
                    <motion.button
                        onClick={handleMinimize}
                        className="p-2 md:p-1.5 rounded hover:bg-black/5 text-black h-full flex items-center justify-center min-w-[32px] md:min-w-[26px]"
                        whileTap={{ scale: 0.9 }}
                    >
                        <MinimizeIcon />
                    </motion.button>
                    <motion.button
                        onClick={handleMaximize}
                        className="p-2 md:p-1.5 rounded hover:bg-black/5 text-black h-full flex items-center justify-center min-w-[32px] md:min-w-[26px]"
                        whileTap={{ scale: 0.9 }}
                    >
                        {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
                    </motion.button>
                    <motion.button
                        onClick={handleClose}
                        className="p-2 md:p-1.5 rounded hover:bg-red-500/10 text-black hover:text-red-500 h-full flex items-center justify-center min-w-[32px] md:min-w-[26px]"
                        whileTap={{ scale: 0.9 }}
                    >
                        <CloseWindowIcon />
                    </motion.button>
                </div>
            </motion.div>

            {/* Content Area */}
            <AnimatePresence>
                {!isMinimized && (
                    <motion.div
                        className="flex-1 flex overflow-hidden bg-white relative"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="flex-1 overflow-auto scroll-smooth cursor-default">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 8-way Resize Handles */}
            <AnimatePresence>
                {!isMaximized && (
                    <>
                        <div className="absolute top-0 left-0 w-full h-[6px] cursor-n-resize z-20" onMouseDown={(e) => { e.preventDefault(); startResize(e.clientX, e.clientY, 'n'); }} />
                        <div className="absolute bottom-0 left-0 w-full h-[6px] cursor-s-resize z-20" onMouseDown={(e) => { e.preventDefault(); startResize(e.clientX, e.clientY, 's'); }} />
                        <div className="absolute top-0 right-0 w-[6px] h-full cursor-e-resize z-20" onMouseDown={(e) => { e.preventDefault(); startResize(e.clientX, e.clientY, 'e'); }} />
                        <div className="absolute top-0 left-0 w-[6px] h-full cursor-w-resize z-20" onMouseDown={(e) => { e.preventDefault(); startResize(e.clientX, e.clientY, 'w'); }} />
                        <div className="absolute top-0 left-0 w-[12px] h-[12px] cursor-nw-resize z-30" onMouseDown={(e) => { e.preventDefault(); startResize(e.clientX, e.clientY, 'nw'); }} />
                        <div className="absolute top-0 right-0 w-[12px] h-[12px] cursor-ne-resize z-30" onMouseDown={(e) => { e.preventDefault(); startResize(e.clientX, e.clientY, 'ne'); }} />
                        <div className="absolute bottom-0 left-0 w-[12px] h-[12px] cursor-sw-resize z-30" onMouseDown={(e) => { e.preventDefault(); startResize(e.clientX, e.clientY, 'sw'); }} />
                        <div className="absolute bottom-0 right-0 w-[16px] h-[16px] cursor-se-resize bg-(--posthog-3000-100) hover:bg-brand-navy/20 rounded-tl-lg transition-colors z-30 flex items-center justify-center shadow-sm" onMouseDown={(e) => { e.preventDefault(); startResize(e.clientX, e.clientY, 'se'); }}>
                            <div className="w-1.5 h-1.5 bg-brand-navy/30 rounded-full" />
                        </div>
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default React.memo(Window);
