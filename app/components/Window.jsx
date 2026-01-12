'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MinimizeIcon, MaximizeIcon, RestoreIcon, CloseWindowIcon } from './WindowIcons';
import { useWindowInteraction } from '../hooks/useWindowInteraction';

/**
 * Window Component with Premium Visuals and Refactored Logic
 */

const HEADER_HEIGHT = 45;
const MARGIN = 8;
const MOBILE_BREAKPOINT = 768;
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

// Premium Desktop Spring: Snappy, Responsive, and Buttery Smooth
const premiumSpring = {
    type: 'spring',
    stiffness: 300,
    damping: 32,
    mass: 1,
    velocity: 2
};

// Synced spring for layout transitions (maximize/minimize)
const layoutSpring = {
    type: 'spring',
    stiffness: 280,
    damping: 30,
    mass: 1
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
    const [isMobile, setIsMobile] = useState(false);
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
        setIsMobile(mobile);

        const viewWidth = window.innerWidth;
        const viewHeight = window.innerHeight;

        const startW = Math.floor(mobile ? viewWidth * 0.85 : initialWidth);
        const startH = Math.floor(mobile ? viewHeight * 0.7 : initialHeight);
        const centeredX = Math.floor(initialX ?? Math.max(MARGIN, (viewWidth - startW) / 2));
        const centeredY = Math.floor(initialY ?? Math.max(HEADER_HEIGHT + MARGIN, (viewHeight - startH) / 2));

        setPos({ x: centeredX, y: centeredY });
        setSize({ width: startW, height: startH });
        preMaximizeState.current = { x: centeredX, y: centeredY, width: startW, height: startH };

        if (mobile) setIsMaximized(true);
        else setIsMaximized(isMaximizedProp);

        requestAnimationFrame(() => setIsMounted(true));
    }, []);

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

    // Handle Resize (window)
    useEffect(() => {
        const handleWinResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        window.addEventListener('resize', handleWinResize);
        return () => window.removeEventListener('resize', handleWinResize);
    }, []);

    // Sync external props
    useEffect(() => { setIsMaximized(isMaximizedProp); }, [isMaximizedProp]);
    useEffect(() => { setIsMinimized(isMinimizedProp); }, [isMinimizedProp]);

    const handleClose = useCallback((e) => {
        e?.stopPropagation();
        setIsAnimatingOut(true);
        setTimeout(() => onClose?.(), 150);
    }, [onClose]);

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

    const windowStyle = useMemo(() => {
        const base = { zIndex, display: isMinimized ? 'none' : 'flex', transformOrigin: 'center center' };
        if (isMaximized) {
            return { ...base, position: 'fixed', top: HEADER_HEIGHT + MARGIN, left: MARGIN, right: MARGIN, bottom: MARGIN, width: 'auto', height: 'auto' };
        }
        return { ...base, position: 'fixed', top: pos.y, left: pos.x, width: size.width, height: size.height };
    }, [zIndex, isMaximized, isMinimized, pos, size]);

    const getAnimationProps = () => {
        if (isAnimatingOut) return { opacity: 0, scale: 0.2, filter: 'blur(15px)', transition: { duration: 0.25 } };
        if (!isMounted) return { opacity: 0, scale: 0, filter: 'blur(10px)', y: 15 };
        if (isMinimized) {
            const targetX = 50 - (pos.x + size.width / 2);
            const targetY = 15 - (pos.y + size.height / 2);
            return { opacity: 0, scale: 0.05, x: targetX, y: targetY, rotate: -10, filter: 'blur(15px)', pointerEvents: 'none' };
        }

        // Base animations + Focus state animations
        return {
            opacity: isFocused ? 1 : 0.95,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            pointerEvents: 'auto',
            borderColor: isFocused ? 'rgba(37, 75, 133, 0.3)' : 'var(--border-primary)',
            boxShadow: isFocused ? '0 10px 40px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.1)'
        };
    };

    return (
        <motion.div
            ref={windowRef}
            initial={{ opacity: 0, scale: 0, y: 15 }}
            animate={getAnimationProps()}
            transition={premiumSpring}
            onMouseDown={onFocus}
            onTouchStart={onFocus}
            layout="position"
            className="fixed flex flex-col overflow-hidden outline-none border rounded-xl bg-white will-change-transform"
            style={windowStyle}
        >
            {/* Window Header */}
            <motion.div
                className={`flex items-center justify-between h-[30px] px-2 border-b select-none shrink-0 transition-colors duration-300 ${isFocused ? 'bg-(--posthog-3000-100) border-brand-navy/20' : 'bg-(--posthog-3000-50) border-(--border-primary)'
                    } ${!isMaximized ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); }}
                onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
                layout="position"
                transition={layoutSpring}
            >
                <div className={`flex items-center gap-1 flex-1 min-w-0 transition-opacity duration-300 ${isFocused ? 'opacity-100' : 'opacity-60'}`}>
                    {toolbar}
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                    <motion.button onClick={handleMinimize} className="p-1.5 rounded hover:bg-black/5 text-black" whileTap={{ scale: 0.9 }}><MinimizeIcon /></motion.button>
                    <motion.button onClick={handleMaximize} className="p-1.5 rounded hover:bg-black/5 text-black" whileTap={{ scale: 0.9 }}>{isMaximized ? <RestoreIcon /> : <MaximizeIcon />}</motion.button>
                    <motion.button onClick={handleClose} className="p-1.5 rounded hover:bg-red-500/10 text-black hover:text-red-500" whileTap={{ scale: 0.9 }}><CloseWindowIcon /></motion.button>
                </div>
            </motion.div>

            {/* Content Area */}
            <AnimatePresence>
                {!isMinimized && (
                    <motion.div
                        className={`flex-1 flex overflow-hidden bg-white relative transition-all duration-300 ${isFocused ? '' : 'brightness-[0.97]'}`}
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
