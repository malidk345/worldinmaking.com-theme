"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';

// Toolbar Component  
const Toolbar = ({ mode, setMode, onAction }) => {
    const ToolBtn = ({ icon, action, title }) => (
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

    return (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-black/15 bg-white">
            {/* Mode Switcher - Tab Style */}
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

            {/* Toolbar Actions */}
            <div className="flex items-center gap-0.5 overflow-x-auto py-0.5 px-1.5 custom-scrollbar bg-white flex-1 min-h-[36px]">
                <ToolBtn
                    icon={<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /></svg>}
                    action="bold"
                    title="Bold"
                />
                <ToolBtn
                    icon={<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="19" x2="10" y1="4" y2="4" /><line x1="14" x2="5" y1="20" y2="20" /><line x1="15" x2="9" y1="4" y2="20" /></svg>}
                    action="italic"
                    title="Italic"
                />
                <div className="w-px h-3.5 bg-black/10 mx-1" />
                <ToolBtn
                    icon={<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>}
                    action="insertUnorderedList"
                    title="Bullet List"
                />
                <ToolBtn
                    icon={<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M16 4H9a3 3 0 0 0 0 6h7" /><path d="M15 10H9a3 3 0 0 0 0 6h6" /></svg>}
                    action="strikeThrough"
                    title="Strikethrough"
                />
                <div className="w-px h-3.5 bg-black/10 mx-1" />
                <ToolBtn
                    icon={<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" /></svg>}
                    action="formatBlock:blockquote"
                    title="Quote"
                />
                <div className="w-px h-3.5 bg-black/10 mx-1" />
                <ToolBtn
                    icon={<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>}
                    action="showLinkModal"
                    title="Insert Link"
                />
            </div>
        </div>
    );
};

// Rich Text Editor Component
export default function RichTextEditor({ content, onChange, placeholder = "Write something here...", minHeight = "240px" }) {
    const [mode, setMode] = useState('edit');
    const [modal, setModal] = useState(null);
    const editorRef = useRef(null);
    const savedSelection = useRef(null);

    // Initialize content
    useEffect(() => {
        if (editorRef.current && content && editorRef.current.innerHTML !== content) {
            editorRef.current.innerHTML = content;
        }
    }, []);

    const saveSelection = useCallback(() => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            savedSelection.current = sel.getRangeAt(0).cloneRange();
        }
    }, []);

    const restoreSelection = useCallback(() => {
        if (savedSelection.current && editorRef.current) {
            const sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges();
                sel.addRange(savedSelection.current);
            }
        }
    }, []);

    const handleAction = useCallback((type) => {
        // Focus editor first
        if (editorRef.current) {
            editorRef.current.focus();
        }

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

        // Execute command
        if (type.startsWith('formatBlock:')) {
            const block = type.split(':')[1];
            document.execCommand('formatBlock', false, `<${block}>`);
        } else {
            document.execCommand(type, false, null);
        }

        // Update content
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    }, [onChange, saveSelection]);

    const submitModal = useCallback(() => {
        if (!modal || !modal.url.trim()) return;

        // Restore selection and focus
        if (editorRef.current) {
            editorRef.current.focus();
        }
        restoreSelection();

        setTimeout(() => {
            if (modal.type === 'link') {
                document.execCommand('createLink', false, modal.url);
            } else {
                document.execCommand('insertImage', false, modal.url);
            }

            if (editorRef.current) {
                onChange(editorRef.current.innerHTML);
            }
            setModal(null);
        }, 10);
    }, [modal, onChange, restoreSelection]);

    const handleInput = useCallback((e) => {
        onChange(e.currentTarget.innerHTML);
    }, [onChange]);

    const handleKeyDown = useCallback((e) => {
        // Handle Tab key
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '    ');
        }
    }, []);

    return (
        <div className="w-full flex flex-col bg-white border border-black/15 rounded-lg overflow-hidden relative" style={{ minHeight }}>
            <Toolbar mode={mode} setMode={setMode} onAction={handleAction} />

            <div className="flex-1 p-4 overflow-auto bg-white">
                {mode === 'edit' ? (
                    <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        className="w-full h-full outline-none text-sm leading-relaxed text-primary bg-transparent prose-editor"
                        style={{ minHeight: `calc(${minHeight} - 80px)` }}
                        onInput={handleInput}
                        onBlur={saveSelection}
                        onKeyDown={handleKeyDown}
                        data-placeholder={placeholder}
                    />
                ) : (
                    <div
                        className="w-full h-full text-sm leading-relaxed text-primary prose-editor"
                        style={{ minHeight: `calc(${minHeight} - 80px)` }}
                        dangerouslySetInnerHTML={{ __html: content || `<span class="text-secondary italic">${placeholder}</span>` }}
                    />
                )}
            </div>

            {/* Link/Image Modal */}
            {modal && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex items-center justify-center p-4">
                    <div className="w-full max-w-xs bg-white border border-black/15 rounded-lg p-4 shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-primary font-bold text-xs">
                                {modal.type === 'link' ? (
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                ) : (
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                                )}
                                Insert {modal.type}
                            </div>
                            <button type="button" onClick={() => setModal(null)} className="text-secondary hover:text-primary">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>
                        <input
                            autoFocus
                            type="text"
                            placeholder={`Enter ${modal.type} URL...`}
                            className="w-full bg-white border border-black/20 rounded px-3 py-2 text-sm outline-none focus:border-primary transition-colors mb-3"
                            value={modal.url}
                            onChange={(e) => setModal({ ...modal, url: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && submitModal()}
                        />
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setModal(null)}
                                className="LemonButton LemonButton--secondary LemonButton--small flex-1"
                            >
                                <span className="LemonButton__chrome w-full justify-center">
                                    Cancel
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={submitModal}
                                className="LemonButton LemonButton--primary LemonButton--small flex-1"
                            >
                                <span className="LemonButton__chrome px-3 py-1.5 w-full justify-center">
                                    Confirm
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .prose-editor b, .prose-editor strong { font-weight: 700; }
                .prose-editor i, .prose-editor em { font-style: italic; }
                .prose-editor u { text-decoration: underline; }
                .prose-editor s, .prose-editor strike { text-decoration: line-through; }
                .prose-editor blockquote {
                    border-left: 3px solid rgba(0,0,0,0.15);
                    padding-left: 1rem;
                    margin: 0.75rem 0;
                    font-style: italic;
                    color: var(--text-secondary);
                }
                .prose-editor ul {
                    list-style-type: disc;
                    padding-left: 1.5rem;
                    margin: 0.75rem 0;
                }
                .prose-editor ol {
                    list-style-type: decimal;
                    padding-left: 1.5rem;
                    margin: 0.75rem 0;
                }
                .prose-editor pre {
                    background: #f3f4f6;
                    padding: 0.75rem;
                    border-radius: 0.375rem;
                    font-family: ui-monospace, monospace;
                    font-size: 0.85rem;
                    margin: 0.75rem 0;
                    overflow-x: auto;
                }
                .prose-editor img {
                    max-width: 100%;
                    border-radius: 0.375rem;
                    border: 1px solid rgba(0,0,0,0.15);
                    margin: 0.75rem 0;
                }
                /* PostHog Lemon Style Links - Handled globally in globals.css */
                [contenteditable]:empty:before {
                    content: attr(data-placeholder);
                    color: var(--text-secondary);
                    opacity: 0.5;
                    font-style: italic;
                    pointer-events: none;
                }
            `}</style>
        </div>
    );
}
