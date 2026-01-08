'use client';

import React from 'react';
import Window from './Window';

/**
 * PageWindow
 * A generic page wrapper that displays content in a floating window
 * Only has window controls (minimize, maximize, close) - no custom toolbar icons
 * Used for pages other than home and blog
 */
export default function PageWindow({
    id,
    title,
    children,
    onClose
}) {
    return (
        <Window
            id={id || 'page-window'}
            title={title || 'page'}
            onClose={onClose}
            toolbar={null}  // No custom toolbar icons, only window controls
        >
            {children}
        </Window>
    );
}
