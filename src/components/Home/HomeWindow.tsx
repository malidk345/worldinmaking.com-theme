import React from 'react'
import SEO from 'components/seo'
import ScrollArea from 'components/RadixUI/ScrollArea'
import OSButton from 'components/OSButton'
import WimLogo from 'components/WimLogo'
import { useUser } from 'hooks/useUser'
import { useAppActions } from 'context/App'
import LiveTour from './LiveTour'
import WimDeskDemo from './WimDeskDemo'

export default function HomeWindow() {
    const { user } = useUser()
    const { openSignIn } = useAppActions()

    return (
        <div data-scheme="primary" className="bg-transparent text-primary h-full min-h-0 flex flex-col">
            <SEO
                title="home"
                description="a desktop for notebooks, forum debate, and philosopher bots that talk back."
            />
            <ScrollArea className="flex-1 min-h-0">
                <div className="px-5 @md:px-8 py-7 @md:py-8 max-w-5xl">
                    <div className="flex items-center gap-2 mb-4">
                        <WimLogo className="size-6 text-primary" />
                        <span className="text-[11px] font-bold tracking-widest uppercase text-muted">
                            worldinmaking
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary bg-accent/50">
                            Beta
                        </span>
                    </div>

                    <h1 className="text-3xl @md:text-[2.05rem] font-bold tracking-tight leading-tight m-0 mb-2">
                        a desk that writes back.
                    </h1>
                    <p className="text-[15px] text-secondary leading-relaxed m-0 mb-4 max-w-2xl">
                        A real demo here means the real apps: a notebook window, WIM AI snapped beside it, and the
                        latest forum thread pulled from the database. The walkthrough under that is only a map.
                    </p>

                    <div className="flex flex-wrap gap-2 mb-6">
                        {user ? null : (
                            <OSButton size="md" variant="primary" onClick={() => openSignIn()}>
                                Sign in
                            </OSButton>
                        )}
                    </div>

                    <LiveTour />

                    <details className="mt-8 group">
                        <summary className="cursor-pointer text-sm font-semibold text-secondary hover:text-primary list-none flex items-center gap-2">
                            <span className="text-muted group-open:rotate-90 transition-transform">▸</span>
                            30-second map of the loop
                        </summary>
                        <div className="mt-4">
                            <WimDeskDemo />
                        </div>
                    </details>
                </div>
            </ScrollArea>
        </div>
    )
}
