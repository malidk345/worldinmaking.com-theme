"use client";

import React from 'react';

export default function EditorModal({ modal, setModal, submitModal }) {
    if (!modal) return null;

    return (
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
                {modal.type === 'link' && (
                    <input
                        type="text"
                        placeholder="Display text (optional)"
                        className="w-full bg-white border border-black/20 rounded px-3 py-2 text-sm outline-none focus:border-primary transition-colors mb-3"
                        value={modal.label}
                        onChange={(e) => setModal({ ...modal, label: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && submitModal()}
                    />
                )}
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setModal(null)}
                        className="LemonButton LemonButton--secondary LemonButton--small flex-1"
                    >
                        <span className="LemonButton__chrome w-full justify-center">Cancel</span>
                    </button>
                    <button
                        type="button"
                        onClick={submitModal}
                        className="LemonButton LemonButton--primary LemonButton--small flex-1"
                    >
                        <span className="LemonButton__chrome px-3 py-1.5 w-full justify-center">Confirm</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
