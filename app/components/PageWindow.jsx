'use client';

import React from 'react';
import Window from './Window';

/**
 * PageWindow
 * A generic page wrapper that displays content in a floating window
 * Only has window controls (minimize, maximize, close) - no custom toolbar icons
 * Used for pages other than home and blog
 * 
 * These windows get z-index 85 by default, which is:
 * - Above all managed windows (10-80)
 * - Below header (90) and sidebar (100)
 */
export default function PageWindow({
    id,
    title,
    children,
    onClose,
    zIndex = 85,  // Default high z-index for page windows
    onFocus
}) {
    return (
        <Window
            id={id || 'page-window'}
            title={title || 'page'}
            onClose={onClose}
            zIndex={zIndex}
            onFocus={onFocus}
            toolbar={null}  // No custom toolbar icons, only window controls
        >
            {children}
        </Window>
    );
}
