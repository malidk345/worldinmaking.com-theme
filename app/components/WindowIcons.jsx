'use client';

import React from 'react';

// Standard icon class matching posthog-next style
const iconClass = "LemonIcon w-3.5 h-3.5";

// Minimize Icon (horizontal line)
export const MinimizeIcon = ({ className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={`${iconClass} ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
    </svg>
);

// Maximize Icon (empty rectangle)
export const MaximizeIcon = ({ className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={`${iconClass} ${className}`}>
        <rect x="5.25" y="5.25" width="13.5" height="13.5" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// Restore Icon (two overlapping rectangles)
export const RestoreIcon = ({ className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={`${iconClass} ${className}`}>
        <rect x="3" y="9" width="11" height="11" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 9V5.5A1.5 1.5 0 0 1 9.5 4h9A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// Close Icon (X) - matches posthog style
export const CloseWindowIcon = ({ className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={`${iconClass} ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);
