"use client";

import React, { useState, useRef, useEffect } from 'react';

// Toolbar Component
const Toolbar = ({ mode, setMode, onAction }) => {
    const ToolBtn = ({ icon, action, title }) => (
        <button
            onMouseDown={(e) => {
                e.preventDefault();
                onAction(action);
            }}
            title={title.toLowerCase()}
            className="p-1.5 text-[#2d2d2d] hover:bg-[#2d2d2d]/5 rounded-sm transition-all active:scale-90"
        >
            {icon}
        </button>
    );

    return (
        <div className="flex items-center justify-between border-b-[1.5px] border-[#2d2d2d] px-2 py-1 bg-[#fcfcfc]">
            <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar py-0.5">
                <ToolBtn
                    icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12h8a4 4 0 000-8H6v8zm0 0v8h9a4 4 0 000-8H6z" /></svg>}
                    action="bold"
                    title="bold"
                />
                <ToolBtn
                    icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
                    action="italic"
                    title="italic"
                />
                <div className="w-[1px] h-3 bg-[#2d2d2d]/10 mx-1" />
                <ToolBtn
                    icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>}
                    action="insertUnorderedList"
                    title="list"
                />
                <ToolBtn
                    icon={<svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" /></svg>}
                    action="formatBlock:blockquote"
                    title="quote"
                />
                <div className="w-[1px] h-3 bg-[#2d2d2d]/10 mx-1" />
                <ToolBtn
                    icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
                    action="formatBlock:pre"
                    title="code"
                />
                <ToolBtn
                    icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
                    action="showLinkModal"
                    title="link"
                />
                <ToolBtn
                    icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                    action="showImageModal"
                    title="image"
                />
            </div>

            <div className="flex items-center p-0.5 bg-[#f3f4f6] border-[1.5px] border-[#2d2d2d] rounded-md shrink-0 ml-2">
                <button
                    onClick={() => setMode('edit')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-sm text-[10px] font-black transition-all lowercase ${mode === 'edit' ? 'bg-[#254b85] text-white' : 'text-gray-500 hover:text-[#2d2d2d]'
                        }`}
                >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    <span>write</span>
                </button>
                <button
                    onClick={() => setMode('preview')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-sm text-[10px] font-black transition-all lowercase ${mode === 'preview' ? 'bg-[#254b85] text-white' : 'text-gray-500 hover:text-[#2d2d2d]'
                        }`}
                >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    <span>view</span>
                </button>
            </div>
        </div>
    );
};

// Rich Text Editor Component
export default function RichTextEditor({ content, onChange, placeholder = "write something here...", minHeight = "240px" }) {
    const [mode, setMode] = useState('edit');
    const [modal, setModal] = useState(null);
    const editorRef = useRef(null);
    const savedSelection = useRef(null);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== content) {
            editorRef.current.innerHTML = content;
        }
    }, []);

    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            savedSelection.current = sel.getRangeAt(0);
        }
    };

    const restoreSelection = () => {
        if (savedSelection.current) {
            const sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges();
                sel.addRange(savedSelection.current);
            }
        }
    };

    const handleAction = (type) => {
        if (type === 'showLinkModal') {
            saveSelection();
            setModal({ type: 'link', url: '' });
            return;
        }
        if (type === 'showImageModal') {
            saveSelection();
            setModal({ type: 'image', url: '' });
            return;
        }

        if (type.startsWith('formatBlock:')) {
            const block = type.split(':')[1];
            document.execCommand('formatBlock', false, block);
        } else {
            document.execCommand(type, false);
        }

        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const submitModal = () => {
        if (!modal) return;
        restoreSelection();

        if (modal.type === 'link') {
            document.execCommand('createLink', false, modal.url);
        } else {
            document.execCommand('insertImage', false, modal.url);
        }

        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
        setModal(null);
    };

    return (
        <div className="w-full flex flex-col bg-white border-[1.5px] border-[#2d2d2d] rounded-lg overflow-hidden shadow-sm relative" style={{ minHeight }}>
            <Toolbar mode={mode} setMode={setMode} onAction={handleAction} />

            <div className="flex-1 p-4 md:p-5 overflow-auto bg-[#fffefc]">
                {mode === 'edit' ? (
                    <div
                        ref={editorRef}
                        contentEditable
                        className="w-full h-full outline-none text-[14px] leading-relaxed text-[#2d2d2d] bg-transparent prose-compact lowercase"
                        style={{ minHeight: `calc(${minHeight} - 80px)` }}
                        onInput={(e) => onChange(e.currentTarget.innerHTML)}
                        onBlur={saveSelection}
                        data-placeholder={placeholder}
                    />
                ) : (
                    <div
                        className="w-full h-full text-[14px] leading-relaxed text-[#2d2d2d] prose-compact lowercase"
                        style={{ minHeight: `calc(${minHeight} - 80px)` }}
                        dangerouslySetInnerHTML={{ __html: content || `<span class="text-gray-400 italic">${placeholder}</span>` }}
                    />
                )}
            </div>

            {/* Link/Image Modal */}
            {modal && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-20 flex items-center justify-center p-4">
                    <div className="w-full max-w-xs bg-white border-[1.5px] border-[#2d2d2d] rounded-xl p-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-[#2d2d2d] font-black text-xs lowercase">
                                {modal.type === 'link' ? (
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                ) : (
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                )}
                                insert {modal.type}
                            </div>
                            <button onClick={() => setModal(null)} className="text-gray-400 hover:text-black">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <input
                            autoFocus
                            type="text"
                            placeholder={`enter ${modal.type} url...`}
                            className="w-full bg-[#f3f4f6] border-[1.5px] border-[#2d2d2d] rounded-lg px-3 py-2 text-xs outline-none lowercase font-medium mb-3"
                            value={modal.url}
                            onChange={(e) => setModal({ ...modal, url: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && submitModal()}
                        />
                        <button
                            onClick={submitModal}
                            className="w-full py-2 bg-[#254b85] hover:bg-[#335d9d] text-white border-[1.5px] border-[#2d2d2d] rounded-lg text-xs font-black transition-all lowercase"
                        >
                            confirm
                        </button>
                    </div>
                </div>
            )}

            <style jsx>{`
                .prose-compact blockquote {
                    border-left: 3px solid #2d2d2d;
                    padding-left: 1rem;
                    margin: 1rem 0;
                    font-style: italic;
                    opacity: 0.7;
                }
                .prose-compact ul {
                    list-style-type: disc;
                    padding-left: 1.5rem;
                    margin: 1rem 0;
                }
                .prose-compact pre {
                    background: #f3f4f6;
                    padding: 0.75rem;
                    border-radius: 0.375rem;
                    font-family: monospace;
                    font-size: 0.8rem;
                    margin: 1rem 0;
                }
                .prose-compact img {
                    max-width: 100%;
                    border-radius: 0.375rem;
                    border: 1px solid #2d2d2d;
                    margin: 1rem 0;
                }
                .prose-compact a {
                    color: #254b85;
                    text-decoration: underline;
                    font-weight: bold;
                }
                [contenteditable]:empty:before {
                    content: attr(data-placeholder);
                    color: #2d2d2d33;
                    font-style: italic;
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
