import React from 'react'
import { motion } from 'framer-motion'

interface ZoomHoverProps {
    size?: 'xs' | 'sm' | 'md' | 'lg'
    width?: string
    display?: 'block' | 'inline-flex'
    className?: string
    children: React.ReactNode
}

const ZoomHover: React.FC<ZoomHoverProps> = ({
    size = 'sm',
    width = 'inline-flex',
    display,
    className = '',
    children,
}) => {
    const widthClass = width === 'auto' ? 'w-auto' : width === 'full' ? 'w-full' : width
    const displayClass = display || (width === 'full' ? 'block' : 'inline-flex')
    const classes = `${widthClass} ${displayClass} relative ${className}`

    return (
        <motion.div
            className={classes}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
            {children}
        </motion.div>
    )
}

export default ZoomHover
