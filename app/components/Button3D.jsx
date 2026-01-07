"use client";
import React from 'react';
import { motion } from 'framer-motion';

const Button3D = ({
    children,
    onClick,
    variant = 'primary',
    fullWidth = false,
    type = 'button',
    className = ''
}) => {
    const variants = {
        primary: 'bg-gray-900 text-white shadow-[0_4px_0_0_#171717,0_6px_20px_-4px_rgba(0,0,0,0.3)] hover:shadow-[0_6px_0_0_#171717,0_10px_30px_-4px_rgba(0,0,0,0.35)] active:shadow-[0_2px_0_0_#171717,0_4px_10px_-4px_rgba(0,0,0,0.25)]',
        secondary: 'bg-white text-gray-900 border border-gray-300 shadow-[0_4px_0_0_#d1d5db,0_6px_20px_-4px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_0_0_#d1d5db,0_10px_30px_-4px_rgba(0,0,0,0.15)] active:shadow-[0_2px_0_0_#d1d5db,0_4px_10px_-4px_rgba(0,0,0,0.08)]'
    };

    return (
        <motion.button
            type={type}
            onClick={onClick}
            className={`
                px-5 py-2.5 rounded-lg font-semibold lowercase
                transition-all duration-150 ease-out
                ${variants[variant]}
                ${fullWidth ? 'w-full' : ''}
                ${className}
            `}
            whileHover={{ y: -2 }}
            whileTap={{ y: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
            {children}
        </motion.button>
    );
};

export default Button3D;
