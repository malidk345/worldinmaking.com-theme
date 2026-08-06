import React, { useState } from 'react'
import {
    IconAI,
    IconArrowUpRight,
    IconBrowser,
    IconColumns,
    IconCrown,
    IconDashboard,
    IconDocument,
    IconGraph,
    IconHandMoney,
    IconList,
    IconListCheck,
    IconMemory,
    IconMessage,
    IconPlus,
    IconPullRequest,
    IconStack,
    IconTrends,
} from '@posthog/icons'
import TabbedCarousel from 'components/TabbedCarousel'
import type { TabbedCarouselTab } from 'components/TabbedCarousel'
import CloudinaryImage from 'components/CloudinaryImage'
import Link from 'components/Link'
import { StickerAi } from 'components/Stickers/Stickers'
import { RoughAnnotation } from 'components/Code/RoughAnnotation'
import { SectionLabel, AlphaBadge } from './shared'
import { FeaturePanel, IconGroupColumns, SlideCallout } from './FeaturesSection'

// What connects into a channel to make it a hub of work – floated in an arc around the
// channel window, à la the "understand product usage" arc on the homepage carousel.
// Each entry carries [x%, y%] positions at two @container breakpoints (see ArcProducts
// in HeroCarousel/slides.tsx for the coordinate system). Below @2xl these fall back to a grid.
const channelArtifacts: {
    Icon: React.ComponentType<{ className?: string }>
    color: string
    name: string
    href?: string
    '@2xl': [number, number]
    '@3xl': [number, number]
}[] = [
    { Icon: IconDocument, color: 'text-blue', name: 'context.md', '@2xl': [12, 8], '@3xl': [10, 8] },
    { Icon: IconMemory, color: 'text-purple', name: 'Memory', '@2xl': [10, 42], '@3xl': [8, 42] },
    { Icon: IconStack, color: 'text-orange', name: 'Artifacts', '@2xl': [12, 76], '@3xl': [10, 76] },
    {
        Icon: IconMessage,
        color: 'text-yellow',
        name: 'Inbox',
        href: '/docs/self-driving/inbox',
        '@2xl': [88, 8],
        '@3xl': [90, 8],
    },
    { Icon: IconListCheck, color: 'text-green', name: 'To-do list', '@2xl': [90, 42], '@3xl': [92, 42] },
    { Icon: IconPullRequest, color: 'text-red', name: 'PR #4821', '@2xl': [88, 76], '@3xl': [90, 76] },
]

// A floating artifact chip – a small bordered pill so it reads over the tinted slide bg.
// When `href` is set, the chip is a link (used for the Inbox → docs).
export const ChannelArtifactChip = ({
    Icon,
    color,
    name,
    href,
}: {
    Icon: any
    color: string
    name: string
    href?: string
}) => {
    const inner = (
        <>
            <Icon className={`size-4 shrink-0 ${color}`} />
            {name}
        </>
    )
    const classes =
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-primary bg-light px-2.5 py-1.5 text-sm font-semibold text-primary shadow-sm dark:bg-[#222328]'
    return href ? (
        <Link to={href} state={{ newWindow: true }} className={`${classes} no-underline hover:border-secondary`}>
            {inner}
        </Link>
    ) : (
        <span className={classes}>{inner}</span>
    )
}

// The chat rows inside the channel hub – a Slack-style thread that makes clear who kicked off
// which agent. `agent` rows get the PostHog bot avatar + Agent badge; people get initials.
const channelHistory: {
    agent?: boolean
    avatar?: string
    avatarTone?: string
    name: string
    time: string
    mention?: string
    action: string
    task?: { label: string; status: string; tone: string }
}[] = [
    { avatar: 'AL', avatarTone: 'bg-blue text-white', name: 'Adam', time: '1w', action: 'joined the channel' },
    {
        agent: true,
        name: 'PostHog',
        time: '2h',
        mention: '@Peter',
        action: 'started a new task',
        task: { label: 'Add role-based permissions', status: 'PR ready', tone: 'bg-green/15 text-green' },
    },
]

// The three views of Home – click a chip to swap the screenshot.
const homeViews = [
    {
        key: 'list',
        Icon: IconList,
        color: 'text-red',
        activeClasses: 'border-red bg-red/10',
        label: 'List',
        desc: 'triage what needs you',
        src: 'https://res.cloudinary.com/dmukukwp6/image/upload/Home_list_e43dd0c2b5.png',
    },
    {
        key: 'board',
        Icon: IconColumns,
        color: 'text-blue',
        activeClasses: 'border-blue bg-blue/10',
        label: 'Board',
        desc: 'everything in flight',
        src: 'https://res.cloudinary.com/dmukukwp6/image/upload/Home_board_e9d7302c9e.png',
    },
    {
        key: 'config',
        Icon: IconGraph,
        color: 'text-purple',
        activeClasses: 'border-purple bg-purple/10',
        label: 'Config',
        desc: 'a visual workflow map',
        src: 'https://res.cloudinary.com/dmukukwp6/image/upload/Home_config_af49aa4881.png',
    },
]

// Home slide: standard layout – copy + view toggles on top, the selected screenshot bleeding to the
// bottom edge. Clicking a toggle swaps the image and the line beneath the toggles.
export const HomeSlide = () => {
    const [active, setActive] = useState('list')
    const current = homeViews.find((v) => v.key === active) ?? homeViews[0]
    return (
        <div className="flex h-full flex-col rounded bg-primary p-4 @xl:p-6">
            <div className="mb-2 flex items-center gap-2">
                <h3 className="m-0 text-2xl font-bold">Stay in flow</h3>
                <AlphaBadge />
            </div>
            <p className="m-0 text-[15px] text-secondary">
                The <strong className="text-primary">Home</strong> tab gives you a high-level view of all your work. It
                pulls PR feedback, failing checks, review requests, stale branches (and everything else that needs your
                attention) into one place. Stop bouncing between apps, stay in flow with your whole workflow.
            </p>

            {/* View tabs as a pill segmented control – background + border color makes the
                selected view unambiguous, not just a subtle underline. */}
            <div className="mt-4 flex flex-col gap-2 @sm:flex-row @sm:items-end @sm:justify-between">
                <div className="flex gap-2" role="tablist" aria-label="Home views">
                    {homeViews.map(({ key, Icon, color, activeClasses, label }) => {
                        const selected = key === active
                        return (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={selected}
                                onClick={() => setActive(key)}
                                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-semibold transition-colors ${
                                    selected
                                        ? `${activeClasses} text-primary`
                                        : 'border-transparent text-secondary hover:bg-accent'
                                }`}
                            >
                                <Icon className={`size-4 shrink-0 ${selected ? color : 'text-secondary'}`} />
                                {label}
                            </button>
                        )
                    })}
                </div>
                <p className="m-0 text-sm text-secondary @sm:text-right">{current.desc}</p>
            </div>

            <div className="-mx-4 -mb-4 mt-4 overflow-hidden rounded-b leading-[0] @xl:-mx-6 @xl:-mb-6">
                <CloudinaryImage
                    key={current.key}
                    src={current.src}
                    alt={`Home ${current.label} view`}
                    imgClassName="block w-full"
                />
            </div>
        </div>
    )
}

// Orange @mention, matching the channel screenshot.
export const Mention = ({ children }: { children: React.ReactNode }) => (
    <span className="font-semibold text-red dark:text-yellow">{children}</span>
)

// The prompt composer at the bottom of the channel – "what do you want to ship?".
export const ChannelComposer = () => (
    <div className="rounded-md border border-primary bg-light px-3 pb-2 pt-2.5 shadow-sm dark:bg-[#222328]">
        <p className="m-0 text-sm text-secondary">
            What do you want to ship? <span className="text-muted">/ for skills</span>
        </p>
        <div className="mt-2.5 flex items-center gap-2">
            <IconPlus className="size-4 shrink-0 text-secondary" />
            <span className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-md bg-salmon text-white">
                <IconArrowUpRight className="size-3.5" />
            </span>
        </div>
    </div>
)

// The channel window at the center of the hub: a Slack-style thread with clear attribution.
export const ChannelHub = () => (
    <div className="mx-auto w-full max-w-[400px] overflow-hidden rounded-lg border border-primary bg-light text-left shadow-xl dark:bg-[#1d1e22]">
        <div className="border-b border-primary px-4 py-3">
            <h4 className="m-0 text-base font-bold text-primary">access-control</h4>
            <p className="m-0 mt-0.5 text-xs leading-snug text-secondary">
                <Mention>@Peter</Mention> created this channel. It remembers everything.
            </p>
        </div>
        <div className="flex flex-col gap-3 px-4 py-3">
            {channelHistory.map(({ agent, avatar, avatarTone, name, time, mention, action, task }, i) => (
                <div key={i} className="flex gap-2.5">
                    {agent ? (
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-primary bg-accent/40">
                            <IconAI className="size-4 text-primary" />
                        </span>
                    ) : (
                        <span
                            className={`flex size-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${avatarTone}`}
                        >
                            {avatar}
                        </span>
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-primary">{name}</span>
                            {agent && (
                                <span className="rounded bg-blue/10 px-1 py-px text-[10px] font-semibold text-blue dark:bg-blue/20">
                                    Agent
                                </span>
                            )}
                            <span className="text-xs text-secondary">{time}</span>
                        </div>
                        <p className="m-0 text-sm leading-snug text-secondary">
                            {mention && <Mention>{mention} </Mention>}
                            {action}
                        </p>
                        {task && (
                            <div className="mt-1.5 flex items-center gap-2 rounded-md border border-primary bg-light px-2.5 py-1.5 dark:bg-[#222328]">
                                <span className="size-2.5 shrink-0 rounded-full bg-green" />
                                <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary">
                                    {task.label}
                                </span>
                                <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${task.tone}`}
                                >
                                    {task.status}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            ))}
            <ChannelComposer />
        </div>
    </div>
)

// The connected artifacts floating in an arc around the channel hub.
export const ChannelArtifacts = () => {
    const renderSlots = (breakpoint: '@2xl' | '@3xl') =>
        channelArtifacts.map(({ name, Icon, color, href, ...pos }, i) => {
            const [x, y] = pos[breakpoint]
            const duration = 4 + (i % 4) * 0.9
            const delay = -(i * 1.3)
            return (
                <div
                    key={name}
                    className="absolute animate-[scattered-float_ease-in-out_infinite]"
                    style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: 'translate(-50%, -50%)',
                        animationDuration: `${duration}s`,
                        animationDelay: `${delay}s`,
                    }}
                >
                    <ChannelArtifactChip Icon={Icon} color={color} name={name} href={href} />
                </div>
            )
        })

    return (
        <>
            {/* Below @2xl (not enough gutter for the arc): simple grid above the hub */}
            <div className="z-10 mb-4 flex flex-wrap justify-center gap-2 @2xl:hidden">
                {channelArtifacts.map(({ name, Icon, color, href }) => (
                    <ChannelArtifactChip key={name} Icon={Icon} color={color} name={name} href={href} />
                ))}
            </div>
            <div className="absolute inset-0 z-10 hidden @2xl:block @3xl:hidden">{renderSlots('@2xl')}</div>
            <div className="absolute inset-0 z-10 hidden @3xl:block">{renderSlots('@3xl')}</div>
        </>
    )
}

// Channels slide – mirrors the homepage "understand product usage" arc: connected artifacts
// (context.md, memory, inbox, to-do) float around the channel window at the center.
export const ChannelsSlide = () => (
    <div className="@container relative flex h-full flex-col rounded bg-[#F3F4F0] p-4 dark:bg-[#131316] @xl:p-6">
        <div className="mb-2 flex items-center gap-2">
            <h3 className="m-0 text-2xl font-bold">Multiplayer (like work actually is)</h3>
            <AlphaBadge />
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-2 @lg:grid-cols-2">
            <p className="m-0 text-[15px] text-secondary">
                A channel is a group of tasks related to a specific topic or project. Each one keeps its own working
                memory, so kicking off a task doesn't require you to re-brief a goldfish.
            </p>
            <p className="m-0 text-[15px] text-secondary">
                <code className="text-sm font-bold text-primary">CONTEXT.md</code> tells agents the specific details
                they need to know when working in access-control – conventions, gotchas, key files, and anything else
                that isn't obvious from the code.
            </p>
        </div>
        <div className="relative mt-4 flex flex-1 flex-col justify-center @2xl:mt-2 @2xl:min-h-[300px]">
            <ChannelArtifacts />
            <div className="relative mx-auto w-full">
                <ChannelHub />
            </div>
        </div>
    </div>
)

// Light/dark image pair used as a slide visual.
export const SlideImage = ({ light, dark, alt }: { light: string; dark: string; alt: string }) => (
    <>
        <CloudinaryImage src={light} alt={alt} className="dark:hidden" imgClassName="block w-full" />
        <CloudinaryImage src={dark} alt={alt} className="hidden dark:block" imgClassName="block w-full" />
    </>
)

// A single alpha carousel slide: standard layout – copy (plus optional block content) on top,
// visual bleeding to the bottom edge.
export const AlphaSlide = ({
    title,
    visual,
    children,
    extra,
}: {
    title: string
    visual: React.ReactNode
    children: React.ReactNode
    extra?: React.ReactNode
}) => (
    <div className="flex h-full flex-col rounded bg-primary p-4 @xl:p-6">
        <div className="mb-2 flex items-center gap-2">
            <h3 className="m-0 text-2xl font-bold">{title}</h3>
            <AlphaBadge />
        </div>
        <div className="flex-1">
            <p className="m-0 text-[15px] text-secondary">{children}</p>
            {extra}
        </div>
        <div className="-mx-4 -mb-4 mt-4 overflow-hidden rounded-b leading-[0] @xl:-mx-6 @xl:-mb-6">{visual}</div>
    </div>
)

// Example canvases, grouped into two titled columns – mirrors the self-driving "scouts" tab.
const canvasExampleGroups = [
    {
        title: 'Dashboards & reports',
        items: [
            { Icon: IconGraph, color: 'text-blue', name: 'Weekly active users' },
            { Icon: IconTrends, color: 'text-green', name: 'Revenue by plan' },
            { Icon: IconColumns, color: 'text-purple', name: 'Churn cohorts' },
            { Icon: IconDashboard, color: 'text-orange', name: 'Funnel drop-off' },
        ],
    },
    {
        title: 'Internal tools',
        items: [
            { Icon: IconHandMoney, color: 'text-green', name: 'Refund tool' },
            { Icon: IconMessage, color: 'text-yellow', name: 'Support triage' },
            { Icon: IconBrowser, color: 'text-blue', name: 'Customer lookup' },
            { Icon: IconCrown, color: 'text-purple', name: 'AI leaderboard' },
        ],
    },
]

const alphaTabs: TabbedCarouselTab[] = [
    {
        value: 'contexts',
        label: 'Channels',
        color: 'bg-teal',
        activeText: 'text-black',
        progressBar: 'bg-black/70 shadow-[0_0_6px_2px_rgba(255,255,255,0.4)]',
        content: <ChannelsSlide />,
    },
    {
        value: 'canvases',
        label: 'Canvases',
        color: 'bg-salmon',
        activeText: 'text-white',
        progressBar: 'bg-white shadow-[0_0_6px_2px_rgba(0,0,0,0.2)]',
        content: (
            <AlphaSlide
                title="Describe the tool, get the tool"
                visual={
                    <SlideImage
                        light="https://res.cloudinary.com/dmukukwp6/image/upload/cavas_wau_dark_1_413aba435a.png"
                        dark="https://res.cloudinary.com/dmukukwp6/image/upload/cavas_wau_dark_8f7776e12b.png"
                        alt="A generated canvas: a weekly active users report built on your PostHog data"
                    />
                }
                extra={<IconGroupColumns groups={canvasExampleGroups} />}
            >
                Ask for a report, a dashboard, or random internal tool, get exactly what you want in a{' '}
                <strong className="text-primary">canvas</strong> built with generative UI on PostHog's actual data
                model.
            </AlphaSlide>
        ),
    },
    {
        value: 'home',
        label: 'Home',
        color: 'bg-seagreen',
        activeText: 'text-white',
        progressBar: 'bg-white shadow-[0_0_6px_2px_rgba(0,0,0,0.2)]',
        content: <HomeSlide />,
    },
    {
        value: 'autoresearch',
        label: 'Autoresearch',
        color: 'bg-fuchsia',
        activeText: 'text-white',
        progressBar: 'bg-white shadow-[0_0_6px_2px_rgba(0,0,0,0.2)]',
        content: (
            <FeaturePanel
                title="Run a bounded"
                highlightedTitle="experiment loop"
                titleSuffix="inside any task"
                highlightColor="fuchsia"
                alpha
                imageLight="https://res.cloudinary.com/dmukukwp6/image/upload/autoresearch_prompt_light_73dcb825bf.png"
                imageDark="https://res.cloudinary.com/dmukukwp6/image/upload/autoresearch_prompt_dark_ed1e639863.png"
                imageAlt="Prompting an autoresearch task in PostHog Desktop"
            >
                <p className="m-0">
                    <strong className="text-primary">Autoresearch</strong> iteratively modifies your codebase and
                    evaluates against a prompt. Define the metric to optimize, the command or steps to measure it, and
                    the constraints the agent must preserve.
                </p>
                <SlideCallout>
                    It doesn't invent or independently verify the metric – it just follows what you tell it (this is
                    that{' '}
                    <Link to="/newsletter/loops" state={{ newWindow: true }} className="font-semibold underline">
                        agent loops
                    </Link>{' '}
                    thing everyone keeps talking about).
                </SlideCallout>
                <div className="not-prose mt-4 grid grid-cols-1 gap-4 @sm:grid-cols-3">
                    {['Measure a baseline', 'Try an improvement', 'Repeat until it stops'].map((step, i) => (
                        <div key={step} className="flex items-center gap-1.5">
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-fuchsia/15 text-xs font-bold text-fuchsia">
                                {i + 1}
                            </span>
                            <span className="text-base font-bold text-primary">{step}</span>
                        </div>
                    ))}
                </div>
            </FeaturePanel>
        ),
    },
]

// "Alphas within the beta" – the shared, still-cooking workspace, shown as a hero-style carousel
// (visually differentiated from the flat Features carousel above).
export const AgenticWorkspaceSection = () => {
    return (
        <section className="relative mb-12 @xl:mb-16 px-4 @xl:px-8">
            <SectionLabel>
                <span className="inline-flex items-center gap-2.5">
                    <StickerAi className="size-8 shrink-0 -rotate-3" />
                    Alphas within the beta
                </span>
            </SectionLabel>
            <p className="mb-6 max-w-3xl">
                PostHog Desktop is in beta. These bits are still <em>alpha inside it</em> (rough, changing weekly, and
                the most fun). It's where coding stops being a single player, and your team and agents share{' '}
                <RoughAnnotation type="underline" color="#F54E00" strokeWidth={2}>
                    one workspace
                </RoughAnnotation>
                .
            </p>

            <TabbedCarousel tabs={alphaTabs} />
        </section>
    )
}
