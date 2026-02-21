"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast as RadixToast } from 'radix-ui';
import Toast from '../components/RadixUI/Toast';

interface ToastData {
    id: number;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
    title?: string;
}

interface ToastContextType {
    addToast: (message: string, type?: 'info' | 'success' | 'error' | 'warning', title?: string) => void;
    removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<ToastData[]>([]);

    const addToast = useCallback((message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info', title?: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, title }]);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            <RadixToast.Provider swipeDirection="right">
                {children}
                {toasts.map(toast => (
                    <Toast
                        key={toast.id}
                        title={toast.title || (toast.type === 'error' ? 'Error' : toast.type === 'success' ? 'Success' : undefined)}
                        description={toast.message}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
                <RadixToast.Viewport className="fixed bottom-0 right-0 z-[100] m-0 flex flex-col gap-2 p-6 w-[390px] max-w-[100vw] list-none outline-none" />
            </RadixToast.Provider>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
};
