'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    MinimizeIcon,
    MaximizeIcon,
    RestoreIcon,
    CloseIcon,
    SidebarLayoutIcon
} from './Icons';

interface CustomControlsProps {
    toggleMaximize: (mode?: 'standard' | 'fullscreen') => void;
    isMaximized: boolean;
    maximizeMode: 'standard' | 'fullscreen';
    toggleSidebar: () => void;
    openSidebar: () => void;
    isSidebarOpen: boolean;
}

interface WindowProps {
    title: string;
    children: React.ReactNode;
    onClose?: () => void;
    // Updated: sidebarContent can now be a function receiving the active scroll section
    sidebarContent?: React.ReactNode | ((props: { activeSection: string }) => React.ReactNode);
    sidebarPosition?: 'left' | 'right';
    customControls?: React.ReactNode | ((props: CustomControlsProps) => React.ReactNode);
    zIndex?: number;
    onFocus?: () => void;
    initialX?: number;
    initialY?: number;
    initialWidth?: number;
    initialHeight?: number;
}

const HEADER_HEIGHT = 54;
const MARGIN = 8;
const MOBILE_BREAKPOINT = 768;

const Window: React.FC<WindowProps> = ({
    title,
    children,
    onClose,
    sidebarContent,
    sidebarPosition = 'left',
    customControls,
    zIndex = 10,
    onFocus,
    initialX,
    initialY,
    initialWidth,
    initialHeight
}) => {
    // --- STATE ---
    const [pos, setPos] = useState({
        x: initialX ?? 100,
        y: initialY ?? 100
    });
    const [size, setSize] = useState({ width: initialWidth ?? 700, height: initialHeight ?? 500 });
    const [activeSection, setActiveSection] = useState<string>('');

    const posRef = useRef(pos);
    const sizeRef = useRef(size);

    useEffect(() => { posRef.current = pos; }, [pos]);
    useEffect(() => { sizeRef.current = size; }, [size]);

    const [isMinimized, setIsMinimized] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [maximizeMode, setMaximizeMode] = useState<'standard' | 'fullscreen'>('standard');
    const [isClosing, setIsClosing] = useState(false);
    const [isOpening, setIsOpening] = useState(true);
    const [isInternalSidebarOpen, setInternalSidebarOpen] = useState(false);

    // DOM Refs
    const windowRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Interaction Refs
    const dragStart = useRef<{
        mouseX: number;
        mouseY: number;
        initialX: number;
        initialY: number;
        lastValidX: number;
        lastValidY: number;
    } | null>(null);

    const resizeStart = useRef<{
        mouseX: number;
        mouseY: number;
        startW: number;
        startH: number;
        startX: number;
        startY: number;
        lastValidW: number;
        lastValidH: number;
    } | null>(null);

    const prevZIndex = useRef(zIndex);

    useEffect(() => {
        if (zIndex > prevZIndex.current && !isMinimized && !isClosing) {
            windowRef.current?.focus({ preventScroll: true });
        }
        prevZIndex.current = zIndex;
    }, [zIndex, isMinimized, isClosing]);

    useEffect(() => {
        const timer = setTimeout(() => setIsOpening(false), 500);

        if (typeof window !== 'undefined') {
            if (window.innerWidth < MOBILE_BREAKPOINT) {
                setIsMaximized(true);
                setMaximizeMode('standard');
            } else if (initialX === undefined) {
                // Center window if no initial position provided
                const startX = Math.max(MARGIN, (window.innerWidth - 700) / 2);
                const startY = Math.max(HEADER_HEIGHT, (window.innerHeight - 500) / 2);
                setPos({ x: startX, y: startY });
            }
        }
        return () => clearTimeout(timer);
    }, [initialX]);

    // --- SCROLL SPY LOGIC ---
    useEffect(() => {
        const container = contentRef.current;
        if (!container) return;

        const handleScroll = () => {
            // Find all headers inside the content area
            const headers = Array.from(container.querySelectorAll('h1, h2, h3'));
            if (headers.length === 0) return;

            const scrollPosition = container.scrollTop + 100; // Offset for better feel

            // Find the last header that is above the current scroll position
            let currentSectionId = '';
            for (const header of headers) {
                if ((header as HTMLElement).offsetTop <= scrollPosition) {
                    currentSectionId = header.id;
                } else {
                    break;
                }
            }

            if (currentSectionId !== activeSection) {
                setActiveSection(currentSectionId);
            }
        };

        // Throttled scroll listener
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        const throttledScroll = () => {
            if (timeoutId) return;
            timeoutId = setTimeout(() => {
                handleScroll();
                timeoutId = null;
            }, 100);
        };

        container.addEventListener('scroll', throttledScroll);
        return () => container.removeEventListener('scroll', throttledScroll);
    }, [activeSection]);


    const handleClose = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        setIsClosing(true);
        setTimeout(() => {
            if (onClose) onClose();
        }, 300);
    };

    const handleMaximize = (e?: React.MouseEvent | React.TouchEvent, mode: 'standard' | 'fullscreen' = 'standard') => {
        e?.stopPropagation();

        if (isMaximized) {
            if (maximizeMode !== mode) {
                setMaximizeMode(mode);
                return;
            }
            if (typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT) {
                setPos({ x: 12, y: HEADER_HEIGHT + 20 });
                setSize({ width: window.innerWidth - 24, height: window.innerHeight - (HEADER_HEIGHT + 40) });
            }
            setIsMaximized(false);
        } else {
            setMaximizeMode(mode);
            setIsMaximized(true);
        }

        if (isMinimized) setIsMinimized(false);
        if (onFocus) onFocus();
    };

    const handleMinimize = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        setIsMinimized(!isMinimized);
    };

    const toggleInternalSidebar = (e?: React.MouseEvent | React.TouchEvent) => {
        e?.stopPropagation();
        setInternalSidebarOpen(prev => !prev);
    };

    const startDrag = (clientX: number, clientY: number) => {
        if (isMaximized) return;
        if (onFocus) onFocus();

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

    const moveDrag = (clientX: number, clientY: number) => {
        if (!dragStart.current || !windowRef.current) return;

        const dx = clientX - dragStart.current.mouseX;
        const dy = clientY - dragStart.current.mouseY;

        let newX = dragStart.current.initialX + dx;
        let newY = dragStart.current.initialY + dy;

        newX = Math.max(MARGIN, newX);
        newY = Math.max(HEADER_HEIGHT, newY);

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

    const onMouseMoveDrag = (e: MouseEvent) => moveDrag(e.clientX, e.clientY);
    const onTouchMoveDrag = (e: TouchEvent) => {
        e.preventDefault();
        moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    };

    const endDrag = () => {
        if (dragStart.current && windowRef.current) {
            setPos({
                x: dragStart.current.lastValidX,
                y: dragStart.current.lastValidY
            });
            windowRef.current.style.transform = 'none';
        }

        dragStart.current = null;
        document.removeEventListener('mousemove', onMouseMoveDrag);
        document.removeEventListener('touchmove', onTouchMoveDrag);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchend', endDrag);
    };

    const handleMouseDownHeader = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        startDrag(e.clientX, e.clientY);
    };

    const handleTouchStartHeader = (e: React.TouchEvent) => {
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
    };

    const startResize = (clientX: number, clientY: number, direction: 'se' | 'e' | 's') => {
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

        const moveResize = (moveX: number, moveY: number) => {
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

        const onMouseMoveResize = (e: MouseEvent) => moveResize(e.clientX, e.clientY);
        const onTouchMoveResize = (e: TouchEvent) => {
            e.preventDefault();
            moveResize(e.touches[0].clientX, e.touches[0].clientY);
        };

        const endResize = () => {
            if (resizeStart.current) {
                setSize({
                    width: resizeStart.current.lastValidW,
                    height: resizeStart.current.lastValidH
                });
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

    let style: React.CSSProperties = {
        zIndex,
        display: isClosing ? 'none' : 'flex'
    };

    // Removed shadow-2xl class below
    let containerClasses = `
    fixed flex flex-col rounded-xl overflow-hidden border-[1.5px] border-black/20 dark:border-white/30 backface-hidden
    ${isOpening ? 'animate-window-open' : ''}
    ${isClosing ? 'opacity-0 scale-95 transition-all duration-300' : ''}
    outline-none will-change-transform
  `;

    if (isMaximized) {
        if (isMinimized) {
            style = {
                ...style,
                top: typeof window !== 'undefined' ? window.innerHeight - 50 : 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '90%',
                height: '30px',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            };
        } else {
            if (maximizeMode === 'fullscreen') {
                style = {
                    ...style,
                    top: 4,
                    left: 4,
                    width: 'calc(100vw - 8px)',
                    height: 'calc(100dvh - 8px - env(safe-area-inset-bottom))',
                    zIndex: 60,
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                };
            } else {
                style = {
                    ...style,
                    top: HEADER_HEIGHT,
                    left: MARGIN,
                    width: `calc(100vw - ${MARGIN * 2}px)`,
                    height: `calc(100dvh - ${HEADER_HEIGHT + MARGIN}px - env(safe-area-inset-bottom))`,
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                };
            }
        }
    } else {
        if (isMinimized) {
            style = {
                ...style,
                top: pos.y,
                left: pos.x,
                width: size.width,
                height: 30,
                transition: isOpening ? undefined : 'height 0.3s ease, width 0.3s ease'
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

    const renderedCustomControls = typeof customControls === 'function'
        ? customControls({
            toggleMaximize: (mode) => handleMaximize(undefined, mode),
            isMaximized,
            maximizeMode,
            toggleSidebar: () => toggleInternalSidebar(),
            openSidebar: () => setInternalSidebarOpen(true),
            isSidebarOpen: isInternalSidebarOpen
        })
        : customControls;

    // Handle sidebar content rendering (Function vs Node)
    const renderedSidebarContent = typeof sidebarContent === 'function'
        ? sidebarContent({ activeSection })
        : sidebarContent;

    return (
        <div
            ref={windowRef}
            onMouseDown={onFocus}
            onTouchStart={onFocus}
            className={containerClasses}
            style={style}
            role="dialog"
            aria-labelledby={`window-title-${title}`}
            tabIndex={-1}
        >
            {/* Title Bar */}
            <div
                className={`px-4 h-[30px] flex items-center justify-between relative z-10 text-black dark:text-white border-b border-black/10 dark:border-white/10 shrink-0 ${!isMaximized ? 'cursor-grab active:cursor-grabbing touch-none' : ''}`}
                style={{
                    background: 'linear-gradient(color-mix(in hsl, var(--bg), transparent 30%), color-mix(in hsl, var(--bg), transparent 30%))',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)'
                }}
                onMouseDown={handleMouseDownHeader}
                onTouchStart={handleTouchStartHeader}
                onDoubleClick={(e) => handleMaximize(e, 'standard')}
            >
                <div className="w-24 flex items-center shrink-0">
                    {renderedSidebarContent && (
                        <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onClick={toggleInternalSidebar}
                            className={`w-6 h-6 flex items-center justify-center rounded transition-all active:scale-90 ${isInternalSidebarOpen ? 'bg-black/10 dark:bg-white/20' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                            aria-label="toggle window sidebar"
                            title="toggle sidebar"
                        >
                            <SidebarLayoutIcon />
                        </button>
                    )}
                    {renderedCustomControls && (
                        <div
                            className="flex items-center ml-1 pl-1 border-l border-black/10 dark:border-white/10"
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                        >
                            {renderedCustomControls}
                        </div>
                    )}
                </div>

                <div
                    id={`window-title-${title}`}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[13px] font-medium tracking-tighter select-none pointer-events-none whitespace-nowrap lowercase text-black dark:text-white max-w-[calc(100%-230px)] overflow-hidden text-ellipsis"
                >
                    {title}
                </div>

                <div className="w-24 flex items-center justify-end gap-0.5 shrink-0" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                    <button
                        onClick={handleMinimize}
                        className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-90 text-black dark:text-white"
                        title={isMinimized ? "restore" : "minimize"}
                        aria-label={isMinimized ? "restore window" : "minimize window"}
                    >
                        <div className="flex items-center justify-center w-full h-full">
                            <MinimizeIcon />
                        </div>
                    </button>
                    <button
                        onClick={(e) => handleMaximize(e, 'standard')}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-90 text-black dark:text-white ${isMaximized && maximizeMode === 'standard' ? 'bg-black/5 dark:bg-white/10' : ''}`}
                        title={isMaximized ? "restore window" : "maximize"}
                        aria-label={isMaximized ? "restore window size" : "maximize window"}
                    >
                        <div className="flex items-center justify-center w-full h-full">
                            {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
                        </div>
                    </button>
                    <button
                        onClick={handleClose}
                        className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-90 text-black dark:text-white group"
                        title="close"
                        aria-label="close window"
                    >
                        <div className="flex items-center justify-center w-full h-full">
                            <CloseIcon />
                        </div>
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <div className="flex-1 flex overflow-hidden bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 relative h-full">
                    {renderedSidebarContent && sidebarPosition === 'left' && (
                        <div
                            className={`
                 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]
                 border-r border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/80 backdrop-blur-sm overflow-y-auto
                 ${isInternalSidebarOpen ? 'w-64 opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-4 border-r-0'}
               `}
                        >
                            <div className="p-5 w-64">
                                {renderedSidebarContent}
                            </div>
                        </div>
                    )}

                    {/* Added ref to the content container for scroll spy */}
                    <div ref={contentRef} className="flex-1 p-2 md:p-8 overflow-auto h-full scroll-smooth cursor-default relative">
                        {children}
                    </div>

                    {renderedSidebarContent && sidebarPosition === 'right' && (
                        <div
                            className={`
                 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]
                 border-l border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/80 backdrop-blur-sm overflow-y-auto
                 ${isInternalSidebarOpen ? 'w-64 opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-4 border-l-0'}
               `}
                        >
                            <div className="p-5 w-64">
                                {renderedSidebarContent}
                            </div>
                        </div>
                    )}
                </div>
            )}

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
                        className="absolute bottom-0 right-0 w-[16px] h-[16px] cursor-se-resize bg-black/5 dark:bg-white/10 hover:bg-blue-500 rounded-tl-lg z-30 touch-none"
                        onMouseDown={(e) => { e.preventDefault(); startResize(e.clientX, e.clientY, 'se'); }}
                        onTouchStart={(e) => { startResize(e.touches[0].clientX, e.touches[0].clientY, 'se'); }}
                    />
                </>
            )}
        </div>
    );
};

export default Window;
