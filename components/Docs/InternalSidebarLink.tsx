import { Link } from 'react-scroll'
import React from 'react'

export default function InternalSidebarLink({ url, name, depth, onClick, className = '', style = {} }: any) {
    // simplified version for Next.js
    const compact = false // Assuming default or could come from a hook if needed

    return (
        <span>
            <Link
                offset={compact ? -70 : -108}
                style={{ ...style, ...{ paddingLeft: `${(depth || 0) + 1}rem` } }}
                smooth
                duration={300}
                to={url}
                className={`relative block py-1 pr-4 text-primary dark:text-primary-dark hover:bg-accent leading-tight font-medium hover:text-primary dark:hover:text-primary-dark cursor-pointer ${className} ${
                    depth === 0 ? 'font-semibold' : ''
                }`}
                spy
                onClick={(e: any) => onClick && onClick(e)}
                activeClass="active-sidebar-item"
            >
                {name}
            </Link>
        </span>
    )
}
