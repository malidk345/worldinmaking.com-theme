'use client';

import React from 'react';
import { Toast } from '../types';

interface ToastContainerProps {
    toasts: Toast[];
    removeToast: (id: number) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
    return (
        <div className="fixed bottom-4 right-4 z-100 flex flex-col gap-2 pointer-events-none">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className="pointer-events-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-lg p-4 min-w-[300px] animate-fade-up flex items-center justify-between gap-3"
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                        <span className="text-sm font-medium lowercase text-black dark:text-white">{toast.message}</span>
                    </div>
                    <button
                        onClick={() => removeToast(toast.id)}
                        className="text-zinc-400 hover:text-black dark:hover:text-white"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;
