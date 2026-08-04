import React, { useState, useEffect } from 'react'
import SEO from 'components/seo'
import { CallToAction } from 'components/CallToAction'
import * as Icons from '@posthog/icons'
import Link from 'components/Link'
import { usePathname } from 'next/navigation'
import OSTabs from 'components/OSTabs'
import CloudinaryImage from 'components/CloudinaryImage'
import Loading from 'components/Loading'

const AIInstall = ({ setActiveTab }) => (
    <div
        data-scheme="primary"
        className="bg-primary text-primary flex flex-col-reverse @xl:flex-row overflow-hidden rounded"
    >
        <div className="flex-1 p-4 @2xl:p-6">
            <h3>Install with AI in a single prompt</h3>
            <p className="text-[15px]">Paste into your terminal or code editor and make AI do the work.</p>
            <p className="border-t border-primary pt-4 mt-6 text-sm">
                Not into AI?{' '}
                <button className="cursor-pointer font-semibold underline" onClick={() => setActiveTab('signup')}>
                    Sign up the old fashioned way.
                </button>
            </p>
        </div>
        <div
            data-scheme="primary"
            className="w-[40%] hidden @xl:flex items-center justify-center border-l border-primary"
        >
            <div className="w-full bg-accent flex justify-center h-full text-sm relative">
                <CloudinaryImage
                    src="https://res.cloudinary.com/dmukukwp6/image/upload/os_light_4d68fe80d8.png"
                    className="dark:hidden"
                    imgClassName=""
                />
                <CloudinaryImage
                    src="https://res.cloudinary.com/dmukukwp6/image/upload/os_dark_c5dab7be97.png"
                    className="hidden dark:block"
                    imgClassName=""
                />
            </div>
        </div>
    </div>
)

const BoomerInstall = () => (
    <div className="flex flex-1 h-full md:h-[630px] relative">
        <div className="absolute inset-0 flex flex-col gap-2 items-center justify-center">
            <Loading className="size-8 text-muted" />
            <div className="text-sm text-secondary">Loading...</div>
        </div>
        <iframe
            src="https://app.posthog.com/signup"
            className="w-full h-full border-0 rounded relative z-10"
            title="PostHog signup"
            fetchPriority="high"
        />
    </div>
)

export default function Start({ subdomain = 'app', initialTab = 'ai' }) {
    const [activeTab, setActiveTab] = useState(initialTab)

    return (
        <>
            <SEO
                title="Get started – free"
                description="PostHog is the only all-in-one platform for product analytics, feature flags, session replays, experiments, and surveys that's built for developers."
                image={`/images/og/default.png`}
            />
            <OSTabs
                tabs={[
                    {
                        label: 'Install with AI',
                        value: 'ai',
                        content: <AIInstall setActiveTab={setActiveTab} />,
                    },
                    {
                        label: 'Web signup',
                        value: 'signup',
                        content: <BoomerInstall />,
                    },
                ]}
                triggerDataScheme="primary"
                value={activeTab}
                padding
                className="h-full pt-2 px-4 pb-4"
                contentPadding={false}
                onValueChange={setActiveTab}
                extraTabRowContent={
                    <div data-scheme="primary" className="hidden @xl:inline-block text-primary ml-auto text-sm">
                        Need help?{' '}
                        <Link
                            href="/talk-to-a-human"
                            state={{ newWindow: true }}
                            className="group font-semibold underline inline-flex items-center"
                        >
                            <span>Talk to a human</span>
                            <Icons.IconArrowUpRight className="size-3 inline-block text-secondary group-hover:text-primary" />
                        </Link>
                    </div>
                }
                scrollAreaClasses="[&>div]:h-full"
                tabContentClassName="h-full"
            />
        </>
    )
}
