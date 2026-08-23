import React from 'react'
import { Link } from 'react-scroll'
import { useBreakpoint } from 'hooks/useBreakpoint'
import { useLayoutData } from 'components/Layout/hooks'

export default function InternalSidebarLink({ url, name, depth, onClick, className = '', style = {} }) {
    const breakpoints = useBreakpoint()
    const { compact } = useLayoutData()

    return (
        <span>
            <Link
                offset={compact ? -70 : breakpoints.md ? -56 : -108}
                style={{ ...style, ...{ paddingLeft: `${(depth || 0) + 1}rem` } }}
                smooth
                duration={300}
                to={url}
                className={`relative block py-1 pr-4 text-primary dark:text-primary-dark hover:bg-accent leading-tight font-medium hover:text-primary dark:hover:text-primary-dark cursor-pointer ${className} ${
                    depth === 0 ? 'font-semibold' : ''
                }`}
                spy
                onClick={(e) => onClick && onClick(e)}
                activeClass="active-sidebar-item"
            >
                {name}
            </Link>
        </span>
    )
}
