"use client";

import React, { useState } from 'react';

// Icons
const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);

const PenIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"></path>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
    </svg>
);

export default function NewPostToggler({ onPost }) {
    const [isOpen, setIsOpen] = useState(false);
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [loading, setLoading] = useState(false);

    const toggle = () => setIsOpen(!isOpen);

    const handleSubmit = async () => {
        if (!content.trim()) return;

        setLoading(true);
        const postTitle = title.trim() || content.split(' ').slice(0, 5).join(' ') + '...';

        if (onPost) {
            await onPost(content, postTitle, imageUrl.trim() || undefined);
        }

        // Reset and close
        setContent('');
        setTitle('');
        setImageUrl('');
        setIsOpen(false);
        setLoading(false);
    };

    const handleClear = () => {
        setContent('');
        setTitle('');
        setImageUrl('');
    };

    return (
        <>
            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Popover - Mobile: full width bottom sheet, Desktop: positioned */}
            <div
                className={`
                    fixed z-50 bg-white border border-primary shadow-2xl
                    transition-all duration-300 ease-out overflow-hidden
                    ${isOpen
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 translate-y-4 pointer-events-none'
                    }
                    /* Mobile: bottom sheet */
                    inset-x-2 bottom-20 rounded-2xl
                    /* Desktop: positioned card */
                    md:inset-auto md:bottom-20 md:right-6 md:w-80 md:rounded-xl
                `}
            >
                <header className="border-b border-gray-100 p-3 flex items-center gap-2 bg-gray-50/50">
                    <PenIcon />
                    <span className="font-bold text-xs lowercase text-primary">compose</span>
                </header>

                <div className="flex flex-col p-3 gap-3">
                    <input
                        className="w-full bg-transparent border-0 p-0 text-sm font-bold focus:ring-0 placeholder:text-gray-400 outline-none text-primary lowercase"
                        placeholder="title..."
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                    />
                    <textarea
                        className="w-full h-24 bg-transparent border-0 p-0 text-sm focus:ring-0 resize-none outline-none placeholder:text-gray-400 text-secondary leading-relaxed lowercase"
                        placeholder="what's on your mind?"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        autoFocus={isOpen}
                    />
                    <input
                        className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-xs focus:ring-0 placeholder:text-gray-400 outline-none text-secondary lowercase"
                        placeholder="image url (optional)..."
                        value={imageUrl}
                        onChange={e => setImageUrl(e.target.value)}
                    />
                </div>

                <footer className="border-t border-gray-100 p-3 bg-gray-50/50 flex items-center justify-between">
                    <button
                        className="p-2 hover:bg-gray-100 rounded-md transition-colors text-secondary hover:text-primary"
                        onClick={handleClear}
                        title="clear"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"></path>
                            <path d="M22 21H7"></path>
                            <path d="m5 11 9 9"></path>
                        </svg>
                    </button>

                    <button
                        className="LemonButton LemonButton--status-default LemonButton--small"
                        onClick={handleSubmit}
                        disabled={loading || !content.trim()}
                    >
                        <span className="LemonButton__chrome px-4 py-1.5 bg-blue-600 text-white rounded font-bold text-xs shadow-sm hover:opacity-90 transition-opacity">
                            {loading ? '...' : 'send'}
                        </span>
                    </button>

                    {/* Old button style was: px-4 py-2 bg-black text-white rounded-lg ... */}
                    {/* I used a LemonButton-like structure for consistency if needed, or stick to the original design as requested "aynen al". */}
                    {/* User said "art butonunu açıldığındaki tasarımını aynen al". So I should keep the popover mostly as is, but maybe the send button can be styled. */}
                </footer>
            </div>

            {/* Toggle Button - Fixed position - LemonButton Style */}
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    className={`LemonButton LemonButton--secondary LemonButton--status-default LemonButton--small transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}
                    onClick={toggle}
                >
                    <span className="LemonButton__chrome flex items-center justify-center w-12 h-12 bg-white border border-primary rounded-xl font-bold text-secondary hover:text-primary hover:border-black/30 hover:bg-white transition-all shadow-xl">
                        <PlusIcon />
                    </span>
                </button>
            </div>
        </>
    );
}

