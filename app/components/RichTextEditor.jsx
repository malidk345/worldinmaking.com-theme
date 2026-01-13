"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import EditorToolbar from './editor/EditorToolbar';
import EditorModal from './editor/EditorModal';

export default function RichTextEditor({ value, onChange, placeholder = "Write something here...", minHeight = "240px" }) {
    const [mode, setMode] = useState('edit');
    const [modal, setModal] = useState(null);
    const editorRef = useRef(null);
    const savedSelection = useRef(null);

    // Initialize content
    useEffect(() => {
        if (editorRef.current && value && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
        }
    }, [value]);

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
        if (editorRef.current) editorRef.current.focus();

        if (type === 'showLinkModal') {
            saveSelection();
            const sel = window.getSelection();
            setModal({ type: 'link', url: '', label: sel ? sel.toString() : '' });
            return;
        }
        if (type === 'showImageModal') {
            saveSelection();
            setModal({ type: 'image', url: '' });
            return;
        }

        if (type.startsWith('formatBlock:')) {
            document.execCommand('formatBlock', false, `<${type.split(':')[1]}>`);
        } else {
            document.execCommand(type, false, null);
        }

        if (editorRef.current) onChange(editorRef.current.innerHTML);
    }, [onChange, saveSelection]);

    const submitModal = useCallback(() => {
        if (!modal || !modal.url.trim()) return;
        if (editorRef.current) editorRef.current.focus();
        restoreSelection();

        setTimeout(() => {
            if (modal.type === 'link') {
                if (modal.label && modal.label !== window.getSelection().toString()) {
                    document.execCommand('insertHTML', false, `<a href="${modal.url}">${modal.label}</a>`);
                } else {
                    document.execCommand('createLink', false, modal.url);
                }
            } else {
                document.execCommand('insertImage', false, modal.url);
            }
            if (editorRef.current) onChange(editorRef.current.innerHTML);
            setModal(null);
        }, 10);
    }, [modal, onChange, restoreSelection]);

    const handleInput = useCallback((e) => {
        onChange(e.currentTarget.innerHTML);
    }, [onChange]);

    const handleTab = useCallback((e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '    ');
        }
    }, []);

    return (
        <div className="w-full flex flex-col bg-white border border-black/15 rounded-lg overflow-hidden relative" style={{ minHeight }}>
            <EditorToolbar mode={mode} setMode={setMode} onAction={handleAction} />

            <div className="flex-1 p-4 overflow-auto bg-white">
                {mode === 'edit' ? (
                    <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        className="w-full h-full outline-none text-[16px] md:text-sm leading-relaxed text-primary bg-transparent prose-editor"
                        style={{ minHeight: `calc(${minHeight} - 80px)` }}
                        onInput={handleInput}
                        onBlur={saveSelection}
                        onKeyDown={handleTab}
                        data-placeholder={placeholder}
                    />
                ) : (
                    <div
                        className="w-full h-full text-sm leading-relaxed text-primary prose-editor"
                        style={{ minHeight: `calc(${minHeight} - 80px)` }}
                        dangerouslySetInnerHTML={{ __html: value }}
                        data-placeholder={placeholder}
                    />
                )}
            </div>

            <EditorModal modal={modal} setModal={setModal} submitModal={submitModal} />
        </div>
    );
}
