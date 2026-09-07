import React from 'react'

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    to?: string
    href?: string
    subtle?: boolean
    targetBlankIcon?: boolean
    [key: string]: any
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
    { to, href, children, ...props },
    ref
) {
    const url = to || href || '#'
    return (
        <a ref={ref} href={url} {...props}>
            {children}
        </a>
    )
})

export default Link
