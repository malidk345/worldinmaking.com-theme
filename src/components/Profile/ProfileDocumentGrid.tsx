import React from 'react'
import Link from 'components/Link'
import HourglassLoader from 'components/HourglassLoader'
import { IconEllipsis } from '@posthog/icons'
import MenuBar from 'components/RadixUI/MenuBar'

export type ProfileDocumentKind = 'md' | 'txt' | 'note'

export type ProfileDocumentItem = {
    key: string | number
    title: string
    href: string
    excerpt?: string
    imageUrl?: string
    date?: string
    kind?: ProfileDocumentKind
    onRemove?: () => void
}

function kindFromHref(href?: string): ProfileDocumentKind {
    const path = String(href || '').toLowerCase()
    if (path.includes('/notebook')) return 'note'
    if (path.includes('/blog') || path.includes('/posts')) return 'md'
    return 'txt'
}

function fileStem(title: string, href?: string): string {
    const fromPath = String(href || '')
        .split(/[?#]/)[0]
        .split('/')
        .filter(Boolean)
        .pop()
    const raw = fromPath && fromPath !== 'posts' && fromPath !== 'blog' ? fromPath : title
    return (
        String(raw)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 40) || 'untitled'
    )
}

function formatCardDate(raw?: string): string {
    if (!raw) return ''
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return String(raw)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function previewImage(url?: string): string {
    const src = String(url || '').trim()
    if (!src) return ''
    if (src.includes('james_hawkins_posthog')) return ''
    return src
}

function previewText(raw?: string, title?: string): string {
    let text = String(raw || '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/[#>*_`~\-]+/g, ' ')
        .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
        .replace(/\[[^\]]*]\([^)]+\)/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    const heading = String(title || '').trim().toLowerCase()
    if (heading && text.toLowerCase().startsWith(heading)) {
        text = text.slice(heading.length).replace(/^[\s:.\-–—]+/, '').trim()
    }
    if (heading && text.toLowerCase() === heading) return ''
    return text
}

function ProfileDocumentCard({ item }: { item: ProfileDocumentItem }) {
    const kind = item.kind || kindFromHref(item.href)
    const ext = kind === 'note' ? 'md' : kind
    const badge = ext.toUpperCase()
    const image = previewImage(item.imageUrl)
    const text = previewText(item.excerpt, item.title)
    const dated = formatCardDate(item.date)
    const heading = item.title?.trim() || fileStem(item.title, item.href)

    return (
        <div className="group">
            <Link
                to={item.href || '#'}
                state={{ newWindow: true }}
                className="block !no-underline text-primary hover:text-primary"
            >
                <article
                    data-scheme="primary"
                    className="relative overflow-hidden h-[11.75rem] rounded-xl bg-primary border border-primary px-3.5 pt-3.5 shadow-[0_10px_18px_-10px_rgba(0,0,0,0.35)] transition-shadow duration-150 group-hover:shadow-[0_14px_22px_-10px_rgba(0,0,0,0.4)]"
                >
                    <p className="relative z-[1] m-0 text-[12px] font-medium text-muted truncate">
                        {dated || '—'}
                    </p>
                    {image ? (
                        <div className="mt-2 -mx-3.5 h-[9.5rem]">
                            <img src={image} alt="" className="w-full h-full object-cover object-top" />
                        </div>
                    ) : (
                        <p className="m-0 mt-2 mb-0 text-[12.5px] leading-[1.55] text-secondary">
                            {text || 'No preview'}
                        </p>
                    )}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-primary via-primary/85 to-transparent"
                    />
                    <div className="absolute left-3.5 bottom-3 z-[1]">
                        <span className="inline-flex items-center rounded-[4px] border border-primary bg-accent px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-secondary">
                            {badge}
                        </span>
                    </div>
                </article>
            </Link>
            <div className="mt-2.5 flex items-start gap-1">
                <Link
                    to={item.href || '#'}
                    state={{ newWindow: true }}
                    className="min-w-0 flex-1 !no-underline text-primary hover:text-primary"
                >
                    <h3 className="m-0 text-[13px] font-semibold leading-snug line-clamp-2">{heading}</h3>
                </Link>
                {item.onRemove ? (
                    <div
                        className="shrink-0 -mr-1"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                        }}
                    >
                        <MenuBar
                            menus={[
                                {
                                    trigger: (
                                        <button
                                            type="button"
                                            aria-label="Bookmark actions"
                                            className="flex items-center justify-center size-6 rotate-90 text-muted hover:text-primary"
                                        >
                                            <IconEllipsis className="size-4" />
                                        </button>
                                    ),
                                    items: [
                                        {
                                            type: 'item',
                                            label: 'Remove bookmark',
                                            onClick: item.onRemove,
                                        },
                                    ],
                                },
                            ]}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    )
}

export default function ProfileDocumentGrid({
    items,
    loading,
    empty,
}: {
    items: ProfileDocumentItem[]
    loading?: boolean
    empty?: React.ReactNode
}) {
    if (loading) return <HourglassLoader title="Loading documents..." />
    if (!items.length) return <>{empty}</>

    return (
        <ul className="list-none m-0 p-0 grid grid-cols-2 @lg:grid-cols-3 gap-4">
            {items.map((item) => (
                <li key={item.key}>
                    <ProfileDocumentCard item={item} />
                </li>
            ))}
        </ul>
    )
}
