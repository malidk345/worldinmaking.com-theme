import React from 'react'
import Link from 'components/Link'
import HourglassLoader from 'components/HourglassLoader'

export type ProfileNotebookCard = {
    id: string
    short_id: string
    title: string
    excerpt?: string
    category?: string
    coverUrl?: string
    updatedAt: string
}

function formatCardDate(raw?: string): string {
    if (!raw) return ''
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return String(raw)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function NotebookCard({ item }: { item: ProfileNotebookCard }) {
    const href = `/notebooks#/n/${item.short_id || item.id}`
    const dated = formatCardDate(item.updatedAt)
    const excerpt = String(item.excerpt || '').trim()

    return (
        <Link to={href} state={{ newWindow: true }} className="block !no-underline text-primary hover:text-primary">
            <article
                data-scheme="primary"
                className="relative overflow-hidden min-h-[9.5rem] rounded-xl bg-primary border border-primary px-3.5 py-3 shadow-[0_10px_18px_-10px_rgba(0,0,0,0.35)] transition-shadow duration-150 hover:shadow-[0_14px_22px_-10px_rgba(0,0,0,0.4)]"
            >
                {item.coverUrl ? (
                    <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-[#1D4ED8]" />
                ) : (
                    <span aria-hidden className="absolute inset-y-3 left-0 w-[3px] rounded-r bg-[#1D4ED8]/70" />
                )}
                <p className="m-0 text-[12px] font-medium text-muted truncate">{dated || '—'}</p>
                <h3 className="m-0 mt-1.5 text-[14px] font-semibold leading-snug line-clamp-2">{item.title}</h3>
                {excerpt ? (
                    <p className="m-0 mt-2 text-[12.5px] leading-[1.5] text-secondary line-clamp-2">{excerpt}</p>
                ) : null}
                <div className="mt-3 flex items-center gap-1.5">
                    <span className="inline-flex items-center rounded-[4px] border border-primary bg-accent px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-secondary">
                        NOTE
                    </span>
                    {item.category ? (
                        <span className="text-[10px] uppercase tracking-wide text-muted">{item.category}</span>
                    ) : null}
                </div>
            </article>
        </Link>
    )
}

export default function ProfileNotebookGrid({
    items,
    loading,
    empty,
}: {
    items: ProfileNotebookCard[]
    loading?: boolean
    empty?: React.ReactNode
}) {
    if (loading) return <HourglassLoader title="Loading notebooks..." />
    if (!items.length) return <>{empty}</>

    return (
        <ul className="list-none m-0 p-0 grid grid-cols-1 @md:grid-cols-2 gap-3">
            {items.map((item) => (
                <li key={item.id || item.short_id}>
                    <NotebookCard item={item} />
                </li>
            ))}
        </ul>
    )
}
