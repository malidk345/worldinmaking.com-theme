"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ToastItem = ({ toast, onRemove }) => {
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        const duration = 4000;
        const interval = 50;
        const decrement = (interval / duration) * 100;

        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev <= 0) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - decrement;
            });
        }, interval);

        const autoRemove = setTimeout(onRemove, duration);

        return () => {
            clearInterval(timer);
            clearTimeout(autoRemove);
        };
    }, [onRemove]);

    const getTypeStyles = () => {
        switch (toast.type) {
            case 'success':
                return {
                    bg: 'bg-green-50 dark:bg-green-900/20',
                    border: 'border-green-200 dark:border-green-800',
                    dot: 'bg-green-500',
                    progress: 'bg-green-500'
                };
            case 'error':
                return {
                    bg: 'bg-red-50 dark:bg-red-900/20',
                    border: 'border-red-200 dark:border-red-800',
                    dot: 'bg-red-500',
                    progress: 'bg-red-500'
                };
            default:
                return {
                    bg: 'bg-blue-50 dark:bg-blue-900/20',
                    border: 'border-blue-200 dark:border-blue-800',
                    dot: 'bg-blue-500',
                    progress: 'bg-blue-500'
                };
        }
    };

    const styles = getTypeStyles();

    return (
        <motion.div
            initial={{ x: 100, opacity: 0, scale: 0.9 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 100, opacity: 0, scale: 0.9 }}
            transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25
            }}
            className={`relative overflow-hidden ${styles.bg} border ${styles.border} rounded-lg min-w-[320px] max-w-[400px] shadow-lg`}
        >
            <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <motion.div
                        className={`w-2.5 h-2.5 rounded-full ${styles.dot}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1, type: 'spring', stiffness: 500 }}
                    />
                    <span className="text-sm font-medium lowercase text-gray-900 dark:text-gray-100">
                        {toast.message}
                    </span>
                </div>
                <motion.button
                    onClick={onRemove}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </motion.button>
            </div>

            {/* Progress bar */}
            <div className="h-1 w-full bg-gray-100 dark:bg-gray-800">
                <motion.div
                    className={`h-full ${styles.progress} opacity-60`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.05 }}
                />
            </div>
        </motion.div>
    );
};

const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {toasts.map(toast => (
                    <div key={toast.id} className="pointer-events-auto">
                        <ToastItem
                            toast={toast}
                            onRemove={() => removeToast(toast.id)}
                        />
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default React.memo(ToastContainer);
