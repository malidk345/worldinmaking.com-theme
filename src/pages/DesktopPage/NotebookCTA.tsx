import React from 'react'
import Link from 'components/Link'

export default function NotebookCTA() {
    return (
        <section className="px-4 @xl:px-10 py-10 @xl:py-12 border-b border-primary">
            <div className="rounded-xl border border-primary bg-accent/10 p-6 @xl:p-10 flex flex-col @xl:flex-row items-start @xl:items-center gap-6 justify-between">
                <div className="max-w-xl">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">📓</span>
                        <span className="text-[10px] bg-green/20 text-green font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                            Same notes everywhere
                        </span>
                    </div>
                    <h2 className="text-xl font-bold mb-2">Your notebook follows the account, not the browser</h2>
                    <p className="text-sm text-secondary leading-relaxed mb-4">
                        Write on a laptop. Open the same page on your phone. Delete it once and it stays deleted.
                        Sign in first if you want that on more than one device.
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                        {[
                            '✓ Saved to your account',
                            '✓ Works offline, then syncs',
                            '✓ Version history',
                            '✓ Share when you want',
                        ].map((f) => (
                            <span key={f} className="text-xs text-secondary">
                                {f}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center gap-1.5 bg-primary text-bg-primary text-sm font-bold px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                    >
                        Sign in
                    </Link>
                    <Link
                        href="/notebooks"
                        className="inline-flex items-center justify-center gap-1.5 border border-primary text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-accent/30 transition-colors"
                    >
                        Open notebook
                    </Link>
                    <span className="text-xs text-center text-muted">Guest notes stay on this device only</span>
                </div>
            </div>
        </section>
    )
}
