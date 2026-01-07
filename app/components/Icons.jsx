import React from 'react';

// Browser Tab Icon
export const BrowserTab = ({ className = "", style = {} }) => (
    <svg className={`LemonIcon ${className}`} viewBox="0 0 24 24" fill="currentColor" width="100%" xmlns="http://www.w3.org/2000/svg" style={style}>
        <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zm-10-7h9v6h-9v-6z"></path>
    </svg>
);

// Plus / New Tab Icon
export const Plus = ({ className = "" }) => (
    <svg className={`LemonIcon ${className}`} fill="currentColor" viewBox="0 0 24 24" width="100%" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.75 5a.75.75 0 0 0-1.5 0v6.25H5a.75.75 0 0 0 0 1.5h6.25V19a.75.75 0 0 0 1.5 0v-6.25H19a.75.75 0 0 0 0-1.5h-6.25V5Z"></path>
    </svg>
);

// Date / Calendar Icon
export const Calendar = ({ className = "" }) => (
    <svg className={`LemonIcon ${className}`} fill="currentColor" viewBox="0 0 24 24" width="100%" xmlns="http://www.w3.org/2000/svg">
        <path clipRule="evenodd" d="M6.75 3a.75.75 0 0 1 .75.75V5h9V3.75a.75.75 0 0 1 1.5 0V5h1.25A1.75 1.75 0 0 1 21 6.75v12.5A1.75 1.75 0 0 1 19.25 21H4.75A1.75 1.75 0 0 1 3 19.25V6.75A1.75 1.75 0 0 1 4.75 5H6V3.75A.75.75 0 0 1 6.75 3ZM4.5 9.5v9.75c0 .138.112.25.25.25h14.5a.25.25 0 0 0 .25-.25V9.5h-15Z" fillRule="evenodd"></path>
    </svg>
);

// Hamburger Menu Icon
export const Menu = ({ className = "" }) => (
    <svg className={`LemonIcon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="20" y2="12"></line>
        <line x1="4" y1="6" x2="20" y2="6"></line>
        <line x1="4" y1="18" x2="20" y2="18"></line>
    </svg>
);

// Sidebar Toggle / Panel Layout Icon
export const Layout = ({ className = "" }) => (
    <svg className={`LemonIcon ${className}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" fill="none" />
        <path d="M9 3v18" stroke="currentColor" />
    </svg>
);

// Filter / Settings Icon
export const Filter = ({ className = "" }) => (
    <svg className={`LemonIcon ${className}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 6h16M4 12h10M4 18h7" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="18" cy="12" r="2" stroke="currentColor" fill="none" />
        <circle cx="14" cy="18" r="2" stroke="currentColor" fill="none" />
    </svg>
);

// Grid View Icon
export const Grid = ({ className = "" }) => (
    <svg className={`LemonIcon ${className}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="7" height="7" rx="1" fill="none" stroke="currentColor" />
        <rect x="14" y="3" width="7" height="7" rx="1" fill="none" stroke="currentColor" />
        <rect x="3" y="14" width="7" height="7" rx="1" fill="none" stroke="currentColor" />
        <rect x="14" y="14" width="7" height="7" rx="1" fill="none" stroke="currentColor" />
    </svg>
);

// List View Icon
export const List = ({ className = "" }) => (
    <svg className={`LemonIcon ${className}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// Document / Post Icon
export const Document = ({ className = "" }) => (
    <svg className={`LemonIcon ${className}`} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" clipRule="evenodd" d="M4 4a2 2 0 0 1 2-2h8a1 1 0 0 1 .707.293l5 5A1 1 0 0 1 20 8v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Zm2 0h7v4a1 1 0 0 0 1 1h4v11H6V4Zm9.586 3L14 5.414V7h1.586Z"></path>
    </svg>
);

// Close / X Icon
export const Close = ({ className = "" }) => (
    <svg className={`LemonIcon ${className}`} fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fillRule="evenodd" clipRule="evenodd" d="M4.75 3.69 12 10.94l7.25-7.25 1.06 1.06L13.06 12l7.25 7.25-1.06 1.06L12 13.06l-7.25 7.25-1.06-1.06L10.94 12 3.69 4.75l1.06-1.06Z"></path>
    </svg>
);

// Table of Contents / Content Icon (for blog post headings)
export const TableOfContents = ({ className = "" }) => (
    <svg className={`LemonIcon ${className}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 6h16M4 10h12M4 14h16M4 18h8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// Sidebar Panel Icon (for left sidebar toggle)
export const SidebarPanel = ({ className = "" }) => (
    <svg className={`LemonIcon ${className}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" fill="none" />
        <path d="M9 3v18" stroke="currentColor" />
        <path d="M5 8h2M5 12h2M5 16h2" strokeLinecap="round" />
    </svg>
);
