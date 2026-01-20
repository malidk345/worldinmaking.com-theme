import React from 'react';

// Selected icons used in the project to maintain clean code and small bundle size.

export const AccessControl = ({ className = "" }) => (
  <svg className={`LemonIcon ${className}`} fill="currentColor" viewBox="0 0 24 24" width="100%" xmlns="http://www.w3.org/2000/svg"><path clipRule="evenodd" d="M7 7.25a5 5 0 0 1 10 0V9h1.25c.966 0 1.75.784 1.75 1.75v9.5A1.75 1.75 0 0 1 18.25 22H5.75A1.75 1.75 0 0 1 4 20.25v-9.5C4 9.784 4.784 9 5.75 9H7V7.25ZM5.75 10.5a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25H5.75ZM15.5 9h-7V7.25a3.5 3.5 0 1 1 7 0V9ZM12 13.25a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 .75-.75Z" fillRule="evenodd"></path></svg>
);

export const Allapps = ({ className = "" }) => (
  <svg className={`LemonIcon ${className}`} fill="currentColor" viewBox="0 0 24 24" width="100%" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.25 3.75H11a.75.75 0 0 0-.75-.75v.75Zm0 6.5V11a.75.75 0 0 0 .75-.75h-.75Zm-6.5 0H3c0 .414.336.75.75.75v-.75Zm.546-6.391.34.668-.34-.668Zm-.437.437.668.34-.668-.34Zm9.891-.546V3a.75.75 0 0 0-.75.75h.75Zm6.5 6.5V11a.75.75 0 0 0 .75-.75h-.75Zm-6.5 0H13c0 .414.336.75.75.75v-.75Zm5.954-6.391-.34.668.34-.668ZM5.35 4.5h4.9V3h-4.9v1.5Zm4.15-.75v6.5H11v-6.5H9.5Zm.75 5.75h-6.5V11h6.5V9.5Zm-5.75.75v-4.9H3v4.9h1.5ZM5.35 3c-.268 0-.513 0-.718.016a1.774 1.774 0 0 0-.676.175l.68 1.336c-.016.009-.002-.006.118-.016.13-.01.304-.011.596-.011V3Z"></path>
  </svg>
);

export const Home = ({ className = "" }) => (
  <svg className={`LemonIcon ${className}`} viewBox="0 0 24 24" width="100%" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 4L21 9.5V20C21 20.5523 20.5523 21 20 21H15V14H9V21H4C3.44772 21 3 20.5523 3 20V9.5Z" />
  </svg>
);

export const Search = ({ className = "" }) => (
  <svg className={`LemonIcon ${className}`} fill="currentColor" viewBox="0 0 24 24" width="100%" xmlns="http://www.w3.org/2000/svg">
    <path clipRule="evenodd" d="M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM3 11a8 8 0 1 1 14.162 5.102l3.618 3.618a.75.75 0 1 1-1.06 1.06l-3.618-3.618A8 8 0 0 1 3 11Z" fillRule="evenodd"></path>
  </svg>
);

export const Community = ({ className = "" }) => (
  <svg className={`LemonIcon ${className}`} viewBox="0 0 24 24" width="100%" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

export const Services = ({ className = "" }) => (
  <svg className={`LemonIcon ${className}`} viewBox="0 0 24 24" width="100%" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

export const Contact = ({ className = "" }) => (
  <svg className={`LemonIcon ${className}`} viewBox="0 0 24 24" width="100%" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

export const About = ({ className = "" }) => (
  <svg className={`LemonIcon ${className}`} viewBox="0 0 24 24" width="100%" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const WriteForWim = ({ className = "" }) => (
  <svg className={`LemonIcon ${className}`} viewBox="0 0 24 24" width="100%" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export const DarkMode = ({ className = "" }) => (
  <svg className={`LemonIcon ${className}`} viewBox="0 0 24 24" width="100%" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

export const LightMode = ({ className = "" }) => (
  <svg className={`LemonIcon ${className}`} viewBox="0 0 24 24" width="100%" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

export const Instagram = ({ className = "" }) => (
  <svg className={`LemonIcon ${className}`} fill="currentColor" viewBox="0 0 24 24" width="100%" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

export const X = ({ className = "" }) => (
  <svg className={`LemonIcon ${className}`} fill="currentColor" viewBox="0 0 24 24" width="100%" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export const User = ({ className = "" }) => (
  <svg className={`LemonIcon ${className}`} viewBox="0 0 24 24" width="100%" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const Login = ({ className = "" }) => (
  <svg className={`LemonIcon ${className}`} viewBox="0 0 24 24" width="100%" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="10" r="3" />
    <path d="M7 20c0-3 2.5-5 5-5s5 2 5 5" />
  </svg>
);
