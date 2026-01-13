'use client';

import { useRef, useCallback, useState } from 'react';

const HEADER_HEIGHT = 38;
const MARGIN = 8;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 200;

export const useWindowInteraction = ({
    windowRef,
    posRef,
    sizeRef,
    setPos,
    setSize,
    onPositionChange,
    onSizeChange,
    onFocus,
    isMaximized,
    isMinimized,
    preMaximizeState
}) => {
    const dragStartRef = useRef(null);
    const resizeStartRef = useRef(null);

    // State-based flags for proper React reactivity
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

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
        setIsDragging(true);
    }, [isMaximized, onFocus, posRef]);

    const handleDragMove = useCallback((clientX, clientY) => {
        if (!dragStartRef.current || !windowRef.current) return;
        const dx = clientX - dragStartRef.current.mouseX;
        const dy = clientY - dragStartRef.current.mouseY;
        let newX = dragStartRef.current.initialX + dx;
        let newY = dragStartRef.current.initialY + dy;

        newX = Math.max(MARGIN, Math.min(newX, window.innerWidth - sizeRef.current.width - MARGIN));
        newY = Math.max(HEADER_HEIGHT + MARGIN, Math.min(newY, window.innerHeight - MARGIN - sizeRef.current.height));

        dragStartRef.current.lastValidX = newX;
        dragStartRef.current.lastValidY = newY;

        const effectiveDeltaX = newX - dragStartRef.current.initialX;
        const effectiveDeltaY = newY - dragStartRef.current.initialY;
        windowRef.current.style.transform = `translate3d(${effectiveDeltaX}px, ${effectiveDeltaY}px, 0)`;
    }, [windowRef, sizeRef]);

    const handleDragEnd = useCallback(() => {
        if (dragStartRef.current && windowRef.current) {
            const newPos = {
                x: Math.round(dragStartRef.current.lastValidX),
                y: Math.round(dragStartRef.current.lastValidY)
            };
            setPos(newPos);
            onPositionChange?.(newPos);
            windowRef.current.style.transform = 'none';
            if (preMaximizeState) {
                preMaximizeState.current = { ...preMaximizeState.current, ...newPos };
            }
        }
        dragStartRef.current = null;
        setIsDragging(false);
    }, [onPositionChange, setPos, windowRef, preMaximizeState]);

    const startResize = useCallback((clientX, clientY, direction) => {
        if (isMaximized || isMinimized) return;
        onFocus?.();

        resizeStartRef.current = {
            mouseX: clientX,
            mouseY: clientY,
            startW: sizeRef.current.width,
            startH: sizeRef.current.height,
            startX: posRef.current.x,
            startY: posRef.current.y,
            lastValidW: sizeRef.current.width,
            lastValidH: sizeRef.current.height,
            lastValidX: posRef.current.x,
            lastValidY: posRef.current.y,
            direction
        };
        setIsResizing(true);
    }, [isMaximized, isMinimized, onFocus, posRef, sizeRef]);

    const handleResizeMove = useCallback((moveX, moveY) => {
        if (!resizeStartRef.current || !windowRef.current) return;
        const { startX, startY, startW, startH, mouseX, mouseY, direction } = resizeStartRef.current;
        const dx = moveX - mouseX;
        const dy = moveY - mouseY;

        let newW = startW;
        let newH = startH;
        let newX = startX;
        let newY = startY;

        if (direction.includes('e')) {
            newW = Math.max(MIN_WIDTH, startW + dx);
            newW = Math.min(newW, window.innerWidth - startX - MARGIN);
        } else if (direction.includes('w')) {
            const maxDx = startW - MIN_WIDTH;
            const effectiveDx = Math.max(-startX + MARGIN, Math.min(dx, maxDx));
            newW = startW - effectiveDx;
            newX = startX + effectiveDx;
        }

        if (direction.includes('s')) {
            newH = Math.max(MIN_HEIGHT, startH + dy);
            newH = Math.min(newH, window.innerHeight - startY - MARGIN);
        } else if (direction.includes('n')) {
            const maxDy = startH - MIN_HEIGHT;
            const effectiveDy = Math.max(-startY + (HEADER_HEIGHT + MARGIN + 8), Math.min(dy, maxDy));
            newH = startH - effectiveDy;
            newY = startY + effectiveDy;
        }

        resizeStartRef.current.lastValidW = newW;
        resizeStartRef.current.lastValidH = newH;
        resizeStartRef.current.lastValidX = newX;
        resizeStartRef.current.lastValidY = newY;

        windowRef.current.style.width = `${newW}px`;
        windowRef.current.style.height = `${newH}px`;
        windowRef.current.style.left = `${newX}px`;
        windowRef.current.style.top = `${newY}px`;
    }, [windowRef]);

    const handleResizeEnd = useCallback(() => {
        if (resizeStartRef.current) {
            const newSize = {
                width: Math.round(resizeStartRef.current.lastValidW),
                height: Math.round(resizeStartRef.current.lastValidH)
            };
            const newPos = {
                x: Math.round(resizeStartRef.current.lastValidX),
                y: Math.round(resizeStartRef.current.lastValidY)
            };

            setSize(newSize);
            setPos(newPos);
            onSizeChange?.(newSize);
            onPositionChange?.(newPos);
            if (preMaximizeState) {
                preMaximizeState.current = { ...newPos, ...newSize };
            }

            if (windowRef.current) {
                windowRef.current.style.left = '';
                windowRef.current.style.top = '';
            }
        }
        resizeStartRef.current = null;
        setIsResizing(false);
    }, [onPositionChange, onSizeChange, setPos, setSize, windowRef, preMaximizeState]);

    return {
        startDrag,
        handleDragMove,
        handleDragEnd,
        startResize,
        handleResizeMove,
        handleResizeEnd,
        isDragging,
        isResizing
    };
};
