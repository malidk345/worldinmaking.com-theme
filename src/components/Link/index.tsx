import { TooltipContent, TooltipContentProps } from 'components/GlossaryElement'
import Tooltip from 'components/Tooltip'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import React, { useMemo } from 'react'
import usePostHog from '../../hooks/usePostHog'
import { IconArrowUpRight } from '@posthog/icons'
import ContextMenu, { ContextMenuItemProps } from 'components/RadixUI/ContextMenu'
import { useAppSettings, useAppContext, useAppActions } from '../../context/App'
import { useWindow } from '../../context/Window'
import { sanitizeNavigationUrl } from 'lib/utils'

// Helper function to create standard context menu items
const createStandardMenuItems = (url: string, state?: any, isExternal = false): ContextMenuItemProps[] => {
    const fullUrl = url?.startsWith('/') ? `https://worldinmaking.com${url}` : url

    return [
        {
            type: 'item',
            disabled: isExternal,
            children: isExternal ? (
                <span>open in new window</span>
            ) : (
                <Link href={url} state={{ ...state, newWindow: true }} contextMenu={false}>
                    open in new window
                </Link>
            ),
        },
        {
            type: 'item',
            disabled: isExternal,
            children: isExternal ? (
                <span>Open in side by side view</span>
            ) : (
                <Link href={url} state={{ ...state, newWindow: true, sideBySide: 'right' }} contextMenu={false}>
                    Open in side by side view
                </Link>
            ),
        },
        {
            type: 'item',
            children: (
                <a href={url} target="_blank" rel="noreferrer">
                    Open in new browser tab
                </a>
            ),
        },
        {
            type: 'item',
            children: <span onClick={() => navigator.clipboard.writeText(fullUrl)}>Copy link address</span>,
        },
    ]
}
export interface Props {
    to?: string
    children: React.ReactNode
    className?: string
    wrapperClassName?: string
    onClick?: (e: React.MouseEvent<HTMLButtonElement> | React.MouseEvent<HTMLAnchorElement>) => void
    disablePrefetch?: boolean
    external?: boolean
    externalNoIcon?: boolean
    iconClasses?: string
    state?: any
    event?: string
    href?: string
    glossary?: TooltipContentProps[]
    preview?: TooltipContentProps
    disabled?: boolean
    contextMenu?: boolean
    customMenuItems?: ContextMenuItemProps[]
    [key: string]: any // Allow spread props
}

const MenuWrapper = ({
    children,
    menuItems,
    className = '',
}: {
    children: React.ReactNode
    menuItems: ContextMenuItemProps[]
    className?: string
}) => {
    return (
        <ContextMenu menuItems={menuItems} className={className}>
            {children}
        </ContextMenu>
    )
}

function resolveRelativeLink(url?: string, href?: string) {
    if (!url || !href) return url
    const mdRegex = /\.(md|mdx)(?=$|[?#])/
    const relativeRegex = /^\.\.?\//
    const isMarkdownLink = relativeRegex.test(url) && mdRegex.test(url)
    if (isMarkdownLink) {
        try {
            const urlObj = new URL(url, href)
            return urlObj.pathname.replace(mdRegex, '') + urlObj.search + urlObj.hash
        } catch {
            return url
        }
    }
    return url
}

export default function Link({
    to,
    children,
    className = '',
    wrapperClassName = '',
    disabled,
    onClick,
    disablePrefetch,
    external,
    externalNoIcon,
    iconClasses = '',
    state = {},
    event = '',
    href,
    glossary,
    contextMenu = true,
    customMenuItems = [],
    ...other
}: Props): JSX.Element {
    const router = useRouter()
    const { appWindow } = useWindow()
    const { posthogInstance, compact } = useAppSettings()
    const posthog = usePostHog()
    const locationHref = appWindow?.element?.props?.location?.href
    const initialUrl = to || href
    const url = resolveRelativeLink(initialUrl, locationHref)
    const safeUrl = useMemo(() => {
        return sanitizeNavigationUrl(url)
    }, [url])
    const linkState = state?.newWindow && state?.preventScroll === undefined ? { ...state, preventScroll: true } : state
    const internal = !disablePrefetch && safeUrl && /^\/(?!\/)/.test(safeUrl)
    const isPostHogAppUrl = url && /(eu|us|app)\.posthog\.com/.test(url)
    const preview =
        other.preview ||
        glossary?.find((glossaryItem) => {
            return glossaryItem?.slug === url?.replace(/https:\/\/posthog.com/gi, '')
        })
    const isSignupUrl = useMemo(() => {
        if (!url) return false
        try {
            const urlObj = new URL(url)
            return isPostHogAppUrl && urlObj.pathname === '/signup'
        } catch {
            return false
        }
    }, [url, isPostHogAppUrl])

    const appSettings = useAppSettings()
    const { addWindow } = useAppActions()
    const safePush = appSettings?.safePush

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement> | React.MouseEvent<HTMLAnchorElement>) => {
        if (isPostHogAppUrl && !posthogInstance) {
            posthog?.createPersonProfile?.()
        }
        if (event && posthog) {
            posthog.capture(event)
        }
        onClick && onClick(e)

        if (internal && safeUrl && !e.defaultPrevented) {
            e.preventDefault()

            const target = e.currentTarget as HTMLElement
            const rect = target?.getBoundingClientRect ? target.getBoundingClientRect() : null
            const fromOrigin = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined

            // DIRECT WORLDINMAKING ADDWINDOW CALL (0ms latency window pop & URL pushState)
            addWindow({
                key: linkState?.newWindow ? `${safeUrl}-${Date.now()}` : safeUrl,
                path: safeUrl,
                title: safeUrl.split('/').pop() || 'window',
                fromOrigin,
                ...linkState,
            })
            return
        }
        if (compact && url && !internal) {
            e.preventDefault()
            if (/(eu|us|app)\.posthog\.com/.test(url)) {
                // nosemgrep: javascript.browser.security.wildcard-postmessage-configuration.wildcard-postmessage-configuration - intentional for docs embedding, parent origin unknown, non-sensitive navigation URL
                window.parent.postMessage(
                    {
                        type: 'external-navigation',
                        url,
                    },
                    '*'
                )
            } else {
                window.open(url, '_blank', 'noopener,noreferrer')
            }
        }
    }

    // Determine if link is external
    const isExternal = Boolean(
        !internal || !!external || !!externalNoIcon || (url && !url.startsWith('/') && !url.includes('posthog.com'))
    )

    // Create context menu items
    const menuItems =
        contextMenu && url
            ? [
                  ...createStandardMenuItems(url, state, isExternal),
                  ...(customMenuItems.length > 0 ? [{ type: 'separator' as const }, ...customMenuItems] : []),
              ]
            : []

    // Shared internal link renderer
    const renderInternalLink = (extraProps?: any) => {
        const hasDynamicBrackets = /\[[^\]]+\]/.test(safeUrl)
        if (hasDynamicBrackets) {
            return (
                <a {...other} {...extraProps} href={safeUrl} className={className} onClick={handleClick}>
                    {children}
                </a>
            )
        }
        if (preview) {
            return (
                <Tooltip
                    tooltipClassName={compact ? 'hidden' : ''}
                    offset={[0, 0]}
                    placement="left-start"
                    content={(setOpen: any) => (
                        <TooltipContent
                            setOpen={setOpen}
                            title={preview.title}
                            slug={url}
                            description={preview.description}
                            video={preview.video}
                        />
                    )}
                >
                    <NextLink {...other} {...extraProps} href={safeUrl} className={className} onClick={handleClick}>
                        {children || null}
                    </NextLink>
                </Tooltip>
            )
        }
        return (
            <NextLink {...other} {...extraProps} href={safeUrl} className={className} onClick={handleClick}>
                {children}
            </NextLink>
        )
    }

    // Shared external link renderer
    const renderExternalLink = () => (
        <a
            rel="noopener noreferrer"
            onClick={handleClick}
            {...other}
            href={url}
            className={`${className} group`}
            target={isSignupUrl || external || externalNoIcon ? '_blank' : ''}
        >
            {external ? (
                <span className="inline-flex justify-center items-center group">
                    <span className="font-semibold underline">{children}</span>
                    <IconArrowUpRight
                        className={`size-4 text-muted group-hover:text-secondary relative ${iconClasses}`}
                    />
                </span>
            ) : (
                children
            )}
        </a>
    )

    const content = !contextMenu || !url ? (
        <>
            {onClick && !url ? (
                <button onClick={handleClick} className={className} disabled={disabled}>
                    {children}
                </button>
            ) : internal ? (
                renderInternalLink()
            ) : (
                renderExternalLink()
            )}
        </>
    ) : (
        <MenuWrapper menuItems={menuItems} className={wrapperClassName}>
            {onClick && !url ? (
                <button onClick={handleClick} className={className} disabled={disabled}>
                    {children}
                </button>
            ) : internal ? (
                renderInternalLink()
            ) : (
                renderExternalLink()
            )}
        </MenuWrapper>
    )

    return content
}
