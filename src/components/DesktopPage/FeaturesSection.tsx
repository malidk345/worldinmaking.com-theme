import React from 'react'
import {
    IconAI,
    IconBatteryCharge,
    IconBrain,
    IconFlask,
    IconGraph,
    IconHandMoney,
    IconLive,
    IconPulse,
    IconTerminal,
    IconToggle,
    IconWarning,
} from '@posthog/icons'
import TabbedCarousel from 'components/TabbedCarousel'
import type { TabbedCarouselTab } from 'components/TabbedCarousel'
import CloudinaryImage from 'components/CloudinaryImage'
import { AlphaBadge } from './shared'

const instrumentationItems = [
    {
        icon: IconPulse,
        color: 'text-pink',
        title: 'Capture logs',
        description: 'Capture structured application logs for inspection and debugging.',
    },
    {
        icon: IconGraph,
        color: 'text-blue',
        title: 'Track events',
        description: 'Instruments events so you can measure changes in production.',
    },
    {
        icon: IconWarning,
        color: 'text-yellow',
        title: 'Track errors',
        description: 'Capture exceptions with full stack traces so new issues surface quickly.',
    },
    {
        icon: IconLive,
        color: 'text-purple',
        title: 'Trace LLM calls',
        description: 'Inspect traces, spans, latency, usage, and per-user costs for AI-powered features.',
    },
    {
        icon: IconToggle,
        color: 'text-teal',
        title: 'Add a feature flag',
        description: 'Ship changes behind a flag to control the rollout (and kill it fast).',
    },
    {
        icon: IconFlask,
        color: 'text-purple',
        title: 'Run an experiment',
        description: 'Scaffolds A/B tests with control and test variants tied to a primary metric.',
    },
]

// Colour-chip emphasis for part of a carousel slide's title, à la the self-driving carousel
// (TabPanel's highlightedTitle) – ties the highlighted phrase to the tab's own accent colour.
type FeaturePanelHighlightColor = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'fuchsia'
const featurePanelHighlightClasses: Record<FeaturePanelHighlightColor, string> = {
    blue: 'bg-blue/10 text-blue dark:bg-blue/20',
    green: 'bg-green/10 text-green dark:bg-green/20',
    yellow: 'bg-yellow/15 text-yellow dark:bg-yellow/20',
    red: 'bg-red/10 text-red dark:bg-red/20',
    purple: 'bg-purple/10 text-purple dark:bg-purple/20',
    fuchsia: 'bg-fuchsia/10 text-fuchsia dark:bg-fuchsia/20',
}

// Carousel slide panel, à la the /slack and /self-driving carousels: title + body on
// a bg-primary card, with the screenshot bleeding flush to the card's bottom edge.
export const FeaturePanel = ({
    title,
    highlightedTitle,
    titleSuffix,
    highlightColor = 'blue',
    alpha = false,
    imageLight,
    imageDark,
    imageAlt,
    children,
}: {
    title: string
    highlightedTitle?: string
    titleSuffix?: string
    highlightColor?: FeaturePanelHighlightColor
    alpha?: boolean
    imageLight?: string
    imageDark?: string
    imageAlt?: string
    children: React.ReactNode
}) => {
    const fullTitle = [title, highlightedTitle, titleSuffix].filter(Boolean).join(' ')
    const heading = (
        <h3 className={`m-0 text-2xl font-bold ${alpha ? '' : 'mt-0 mb-2'}`}>
            {title}
            {highlightedTitle && (
                <>
                    {' '}
                    <span className={`rounded-sm px-0.5 ${featurePanelHighlightClasses[highlightColor]}`}>
                        {highlightedTitle}
                    </span>
                    {titleSuffix ? ` ${titleSuffix}` : null}
                </>
            )}
        </h3>
    )
    return (
        <div className="flex h-full flex-col rounded bg-primary p-4 @xl:p-6">
            {alpha ? (
                <div className="mb-2 flex items-center gap-2">
                    {heading}
                    <AlphaBadge />
                </div>
            ) : (
                heading
            )}
            <div className="flex-1 text-[15px] text-secondary">{children}</div>
            {imageLight && imageDark && (
                <div className="-mx-4 -mb-4 mt-4 overflow-hidden rounded-b leading-[0] @xl:-mx-6 @xl:-mb-6">
                    <CloudinaryImage
                        src={imageLight}
                        alt={imageAlt || fullTitle}
                        className="dark:hidden"
                        imgClassName="w-full block"
                    />
                    <CloudinaryImage
                        src={imageDark}
                        alt={imageAlt || fullTitle}
                        className="hidden dark:block"
                        imgClassName="w-full block"
                    />
                </div>
            )}
        </div>
    )
}

// Highlighted callout inside a carousel slide, à la the Slack app page carousel.
export const SlideCallout = ({ children }: { children: React.ReactNode }) => (
    <div className="mt-5 rounded border border-yellow bg-yellow/10 px-3 py-2.5 text-sm text-secondary">{children}</div>
)

// Titled columns of icon + example items, à la the self-driving "scouts" tab: a short group title
// and description, with a few concrete examples listed underneath each.
type IconGroup = {
    title: string
    description?: string
    items: { Icon: React.ComponentType<{ className?: string }>; color: string; name: string }[]
}
export const IconGroupColumns = ({ groups }: { groups: IconGroup[] }) => (
    <div className="mt-4 grid grid-cols-1 gap-6 @sm:grid-cols-2">
        {groups.map((group) => (
            <div key={group.title} className="@container flex flex-col gap-2">
                <div>
                    <p className="m-0 text-base font-bold text-primary">{group.title}</p>
                    {group.description && <p className="m-0 text-sm text-secondary">{group.description}</p>}
                </div>
                <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 @xs:grid-cols-2">
                    {group.items.map(({ Icon, color, name }) => (
                        <span key={name} className="flex items-start gap-1.5 text-sm text-primary">
                            <Icon className={`mt-0.5 size-5 shrink-0 ${color}`} />
                            {name}
                        </span>
                    ))}
                </div>
            </div>
        ))}
    </div>
)

const featureTabs: TabbedCarouselTab[] = [
    {
        value: 'plan',
        label: 'Plan',
        color: 'bg-green',
        activeText: 'text-white',
        progressBar: 'bg-white shadow-[0_0_6px_2px_rgba(0,0,0,0.2)]',
        content: (
            <FeaturePanel
                title="Agree on the"
                highlightedTitle="plan"
                titleSuffix="before any code"
                highlightColor="green"
                imageLight="https://res.cloudinary.com/dmukukwp6/image/upload/plan_mode_light_f271562e0c.png"
                imageDark="https://res.cloudinary.com/dmukukwp6/image/upload/plan_mode_dark_e8253c4a4e.png"
                imageAlt="Plan mode: clarifying questions and an implementation plan to approve"
            >
                <p className="m-0">
                    If <em>dangerously skipping permissions</em> isn't your thing, coding tasks can start in Plan mode.
                    The agent explores your data, asks clarifying questions, then writes an implementation plan for you
                    to approve.
                </p>
                <div className="not-prose mt-4 grid grid-cols-1 gap-4 @sm:grid-cols-3">
                    {[
                        {
                            Icon: IconToggle,
                            color: 'text-green',
                            title: 'Mode',
                            tagline: 'Switch anytime, even mid-task',
                            items: ['Accept Edits', 'Plan Mode', 'Auto Mode'],
                        },
                        {
                            Icon: IconAI,
                            color: 'text-purple',
                            title: 'Model',
                            tagline: 'Choose your weapon',
                            items: ['Claude', 'Codex', 'Open source'],
                        },
                        {
                            Icon: IconBrain,
                            color: 'text-orange',
                            title: 'Effort level',
                            tagline: 'Still effortless for you',
                            items: ['Low–medium', 'High–extra high', 'Max'],
                        },
                    ].map(({ Icon, color, title, tagline, items }) => (
                        <div key={title}>
                            <div className="flex items-center gap-1.5">
                                <Icon className={`size-5 shrink-0 ${color}`} />
                                <span className="text-base font-bold text-primary">{title}</span>
                            </div>
                            <p className="m-0 mt-1 text-sm leading-snug text-secondary">{tagline}</p>
                            <div className="mt-2 flex flex-col gap-1">
                                {items.map((item) => (
                                    <span key={item} className="flex items-center gap-2 text-sm text-secondary">
                                        <span className="size-1.5 shrink-0 rounded-full bg-border" />
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </FeaturePanel>
        ),
    },
    {
        value: 'tasks',
        label: 'Prompt',
        color: 'bg-yellow',
        activeText: 'text-black',
        progressBar: 'bg-black/70 shadow-[0_0_6px_2px_rgba(255,255,255,0.4)]',
        content: (
            <FeaturePanel
                title="Ship code by"
                highlightedTitle="describing it"
                highlightColor="yellow"
                imageLight="https://res.cloudinary.com/dmukukwp6/image/upload/prompt_task_light_ad118d1efc.png"
                imageDark="https://res.cloudinary.com/dmukukwp6/image/upload/prompt_task_dark_6cb8a38596.png"
                imageAlt="Prompting a task in PostHog Desktop"
            >
                <p className="m-0">
                    A <strong className="text-primary">task</strong> is the unit of work in PostHog Desktop. Prompt code
                    changes locally, or in the cloud.
                </p>
                <SlideCallout>
                    <strong className="text-primary">Steer</strong> injects your message at the next tool boundary.{' '}
                    <strong className="text-primary">Queue</strong> holds the message until the current turn ends.
                </SlideCallout>
                <div className="not-prose mt-4 grid grid-cols-1 gap-4 @sm:grid-cols-3">
                    <div>
                        <div className="flex items-center gap-1.5">
                            <IconBatteryCharge className="size-5 shrink-0 text-green" />
                            <span className="text-base font-bold text-primary">Context</span>
                        </div>
                        <p className="m-0 mt-1 text-sm leading-snug text-secondary">
                            A 1M-token window, with a live meter as you chat. Run <code>/compact</code> any time to
                            summarize.
                        </p>
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <IconHandMoney className="size-5 shrink-0 text-orange" />
                            <span className="text-base font-bold text-primary">Cost</span>
                        </div>
                        <p className="m-0 mt-1 text-sm leading-snug text-secondary">
                            It's usage-based, so switching models per task pays off (no need for a bazooka to swat a
                            fly).
                        </p>
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <IconTerminal className="size-5 shrink-0 text-blue" />
                            <span className="text-base font-bold text-primary">Do it here</span>
                        </div>
                        <p className="m-0 mt-1 text-sm leading-snug text-secondary">
                            Prompt changes, attach a screenshot, use a slash command, review the diff, open a terminal.
                        </p>
                    </div>
                </div>
            </FeaturePanel>
        ),
    },
    {
        value: 'command-center',
        label: 'Orchestrate',
        color: 'bg-blue',
        activeText: 'text-white',
        progressBar: 'bg-white shadow-[0_0_6px_2px_rgba(0,0,0,0.2)]',
        content: (
            <FeaturePanel
                title="Manage multiple coding agents"
                highlightedTitle="in parallel"
                highlightColor="blue"
                imageLight="https://res.cloudinary.com/dmukukwp6/image/upload/command_center_dark_1_4295f77be1.png"
                imageDark="https://res.cloudinary.com/dmukukwp6/image/upload/command_center_dark_358aba9c5b.png"
                imageAlt="Manage multiple coding agents in parallel"
            >
                <CloudinaryImage
                    src="https://res.cloudinary.com/dmukukwp6/image/upload/q_auto,f_auto/coastal_hog_79dc4dff47.png"
                    alt="A hedgehog relaxing on a pool float with a laptop"
                    imgClassName="float-right ml-4 mb-2 w-32 @sm:w-40"
                />
                <p className="m-0">
                    Open the Command Center and run up to nine agents at once, mixing local and cloud tasks in the same
                    grid. Each cell shows its own status, environment, and repo (stop one without touching the rest).
                </p>
                <SlideCallout>
                    A full 3x3 grid of agents lit up and running? We call that{' '}
                    <strong className="text-primary">dopamine mode</strong>.
                </SlideCallout>
            </FeaturePanel>
        ),
    },
    {
        value: 'instrument',
        label: 'Instrument',
        color: 'bg-purple',
        activeText: 'text-white',
        progressBar: 'bg-white shadow-[0_0_6px_2px_rgba(0,0,0,0.2)]',
        content: (
            <FeaturePanel title="Control the change," highlightedTitle="measure what happened" highlightColor="purple">
                <p className="m-0">
                    Shipping without instrumentation? Oh, you mean guessing whether it worked. PostHog helps you roll
                    out features to specific users or groups, then test and validate ideas before you ship them to
                    everyone.
                </p>
                <p className="m-0 mt-3">
                    Control the blast radius, ship with confidence (and roll things back when they don't work out).
                </p>
                <ul className="not-prose mt-5 grid list-none grid-cols-1 gap-x-8 gap-y-4 p-0 @sm:grid-cols-2">
                    {instrumentationItems.map(({ icon: Icon, color, title, description }) => (
                        <li key={title}>
                            <div className="flex items-center gap-1.5">
                                <Icon className={`size-5 shrink-0 ${color}`} />
                                <span className="text-base font-bold text-primary">{title}</span>
                            </div>
                            <p className="m-0 mt-1 text-sm leading-snug text-secondary">{description}</p>
                        </li>
                    ))}
                </ul>
                <div className="hidden @2xl:block">
                    <SlideCallout>
                        Agents ship code faster than any human can review it. Instrumentation is how you know what
                        shipped is actually working – not just that it compiled and passed CI.
                    </SlideCallout>
                </div>
            </FeaturePanel>
        ),
    },
]

// Animated, moving gradient text – same treatment as the self-driving carousel's heading
// ("How a product improves itself").
export const FlowingGradientHighlight = ({ children }: { children: React.ReactNode }) => (
    <em
        className="inline animate-gradient-rotate bg-gradient-to-r from-yellow via-green to-blue bg-[length:200%_200%] bg-clip-text not-italic text-transparent motion-reduce:animate-none"
        style={{ animationDuration: '12s' }}
    >
        {children}
    </em>
)

export const Features = () => {
    return (
        <section className="relative mb-12 @xl:mb-16 px-4 @xl:px-8">
            <h2 className="mb-4 text-2xl font-bold">
                Everything you'd expect in an AI coding tool,{' '}
                <span className="block">
                    but <FlowingGradientHighlight>way more...</FlowingGradientHighlight>
                </span>
            </h2>

            <TabbedCarousel tabs={featureTabs} />
        </section>
    )
}
