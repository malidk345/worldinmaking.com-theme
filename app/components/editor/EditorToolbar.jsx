"use client";

import React from 'react';

const ToolBtn = ({ icon, action, onAction, title }) => (
    <button
        type="button"
        onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAction(action);
        }}
        title={title}
        className="LemonButton LemonButton--tertiary"
    >
        <span className="LemonButton__chrome p-1.5 text-primary hover:bg-black/5 rounded transition-all active:scale-90">
            {icon}
        </span>
    </button>
);

export default function EditorToolbar({ mode, setMode, onAction }) {
    return (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-black/15 bg-white">
            {/* Mode Switcher */}
            <div className="flex border-b sm:border-b-0 sm:border-r border-black/10 bg-[#f9fafb] px-2 h-9 items-center gap-4 shrink-0">
                <button
                    type="button"
                    onClick={() => setMode('edit')}
                    className={`h-full flex items-center gap-1.5 text-[11px] font-bold transition-all relative ${mode === 'edit' ? 'text-[#254b85]' : 'text-secondary hover:text-primary'}`}
                >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                    write
                    {mode === 'edit' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#254b85] rounded-t-full" />}
                </button>
                <button
                    type="button"
                    onClick={() => setMode('preview')}
                    className={`h-full flex items-center gap-1.5 text-[11px] font-bold transition-all relative ${mode === 'preview' ? 'text-[#254b85]' : 'text-secondary hover:text-primary'}`}
                >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                    view
                    {mode === 'preview' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#254b85] rounded-t-full" />}
                </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 overflow-x-auto py-0.5 px-1.5 custom-scrollbar bg-white flex-1 min-h-[36px]">
                <ToolBtn onAction={onAction} action="bold" title="Bold" icon={<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /></svg>} />
                <ToolBtn onAction={onAction} action="italic" title="Italic" icon={<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="19" x2="10" y1="4" y2="4" /><line x1="14" x2="5" y1="20" y2="20" /><line x1="15" x2="9" y1="4" y2="20" /></svg>} />
                <div className="w-px h-3.5 bg-black/10 mx-1" />
                <ToolBtn onAction={onAction} action="insertUnorderedList" title="Bullet List" icon={<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>} />
                <ToolBtn onAction={onAction} action="strikeThrough" title="Strikethrough" icon={<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M16 4H9a3 3 0 0 0 0 6h7" /><path d="M15 10H9a3 3 0 0 0 0 6h6" /></svg>} />
                <div className="w-px h-3.5 bg-black/10 mx-1" />
                <ToolBtn onAction={onAction} action="formatBlock:blockquote" title="Quote" icon={<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" /></svg>} />
                <div className="w-px h-3.5 bg-black/10 mx-1" />
                <ToolBtn onAction={onAction} action="showLinkModal" title="Insert Link" icon={<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>} />
                <ToolBtn onAction={onAction} action="showImageModal" title="Insert Image" icon={<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>} />
            </div>
        </div>
    );
}
