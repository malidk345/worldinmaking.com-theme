import React from 'react'
import { IconArrowUpRight, IconSparkles } from '@posthog/icons'
import { LOGOS, type LogoKey } from 'constants/logos'
import CloudinaryImage from 'components/CloudinaryImage'
import Link from 'components/Link'
import Tooltip from 'components/RadixUI/Tooltip'
import { StickerRobot } from 'components/Stickers/Stickers'
import { RoughAnnotation } from 'components/Code/RoughAnnotation'
import { SectionLabel, ModelChip, MiniHogzilla } from './shared'

// MCP marketplace: ~38 servers across six categories. Servers with a dedicated
// brand asset use a LOGOS key; the rest fall back to a favicon by domain (same
// pattern the `granola` logo already uses in constants/logos.ts).
interface MCPServer {
    name: string
    logoKey?: LogoKey
    domain?: string
}

// Ordered by rough developer-community popularity, not alphabetically, so the
// most recognizable servers (GitHub, Slack, Stripe, Supabase…) land in the
// visible rows before the list masks out.
const mcpServers: MCPServer[] = [
    { name: 'GitHub', logoKey: 'github' },
    { name: 'Slack', logoKey: 'slack' },
    { name: 'Notion', domain: 'notion.so' },
    { name: 'Linear', logoKey: 'linear' },
    { name: 'Figma', domain: 'figma.com' },
    { name: 'Stripe', logoKey: 'stripe' },
    { name: 'Supabase', logoKey: 'supabase' },
    { name: 'GitLab', domain: 'gitlab.com' },
    { name: 'Granola', logoKey: 'granola' },
    { name: 'Sentry', logoKey: 'sentry' },
    { name: 'Cloudflare', logoKey: 'cloudflare' },
    { name: 'Datadog', domain: 'datadoghq.com' },
    { name: 'HubSpot', logoKey: 'hubspot' },
    { name: 'Atlassian', domain: 'atlassian.com' },
    { name: 'Postman', domain: 'postman.com' },
    { name: 'ClickHouse', domain: 'clickhouse.com' },
    { name: 'Prisma', domain: 'prisma.io' },
    { name: 'Neon', domain: 'neon.tech' },
    { name: 'PlanetScale', domain: 'planetscale.com' },
    { name: 'Render', domain: 'render.com' },
    { name: 'Clerk', domain: 'clerk.com' },
    { name: 'LaunchDarkly', domain: 'launchdarkly.com' },
    { name: 'PagerDuty', domain: 'pagerduty.com' },
    { name: 'Context7', domain: 'context7.com' },
    { name: 'Canva', domain: 'canva.com' },
    { name: 'Box', domain: 'box.com' },
    { name: 'Monday', domain: 'monday.com' },
    { name: 'Sanity', domain: 'sanity.io' },
    { name: 'Svelte', domain: 'svelte.dev' },
    { name: 'Hex', domain: 'hex.tech' },
    { name: 'Wix', domain: 'wix.com' },
    { name: 'Attio', logoKey: 'attio' },
    { name: 'Mem0', domain: 'mem0.ai' },
    { name: 'Circle', domain: 'circle.so' },
    { name: 'Browserbase', domain: 'browserbase.com' },
    { name: 'AirOps', domain: 'airops.com' },
    { name: 'Cisco ThousandEyes', domain: 'thousandeyes.com' },
    { name: 'Firetiger', domain: 'firetiger.com' },
]

const mcpServerIcon = (server: MCPServer): string =>
    server.logoKey ? LOGOS[server.logoKey] : `https://www.google.com/s2/favicons?domain=${server.domain}&sz=64`

export const SupportedLLMs = () => {
    return (
        <section className="relative mb-12 @xl:mb-16 px-4 @xl:px-8">
            {/* One combined layout: supported-model chips under the title (left),
                the open-source story + cost annotation in the other column (right).
                Both headings live inside the grid so they sit in the same row. */}
            <div className="grid items-start gap-10 @xl:grid-cols-2 @xl:gap-12">
                {/* Left: supported models as compact chip rows, under the main title */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold mb-4">Supported LLMs</h2>
                    <div>
                        <p className="m-0 mb-1.5 text-xs font-semibold uppercase tracking-wide text-secondary">
                            OpenAI
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <ModelChip>GPT-5.6 Sol</ModelChip>
                            <ModelChip>GPT-5.6 Terra</ModelChip>
                            <ModelChip>GPT-5.6 Luna</ModelChip>
                            <ModelChip>GPT-5.5</ModelChip>
                            <ModelChip>GPT-5.4</ModelChip>
                        </div>
                    </div>
                    <div>
                        <p className="m-0 mb-1.5 text-xs font-semibold uppercase tracking-wide text-secondary">
                            Anthropic
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <ModelChip>Claude Fable 5</ModelChip>
                            <ModelChip>Claude Sonnet 4.6</ModelChip>
                            <ModelChip>Claude Opus 4.8</ModelChip>
                            <ModelChip>Claude Opus 4.7</ModelChip>
                            <ModelChip>Claude Haiku 4.5</ModelChip>
                        </div>
                    </div>
                    <CloudinaryImage
                        src="https://res.cloudinary.com/dmukukwp6/image/upload/posthog_fable_task_light_80d657b9d6.png"
                        alt="Picking a model for a task in PostHog Desktop"
                        className="dark:hidden pt-2"
                        imgClassName="w-full rounded border border-primary shadow-xl"
                    />
                    <CloudinaryImage
                        src="https://res.cloudinary.com/dmukukwp6/image/upload/posthog_fable_task_dark_e30ddc1938.png"
                        alt="Picking a model for a task in PostHog Desktop"
                        className="hidden dark:block pt-2"
                        imgClassName="w-full rounded border border-primary shadow-xl"
                    />
                </div>

                {/* Right: subheading (the open-source one), copy, and the hand-drawn cost stat */}
                <div>
                    <h3 className="text-xl font-bold mb-3">Open source models got good? (awkward)</h3>
                    <p className="m-0 mb-1.5 text-xs font-semibold uppercase tracking-wide text-secondary">
                        We support
                    </p>
                    <div className="mb-4 flex flex-wrap items-baseline gap-2">
                        <ModelChip>GLM-5.2</ModelChip>
                        <span className="text-sm font-medium italic text-secondary">
                            …and more, if you have{' '}
                            <Link
                                to="https://discord.com/invite/E9xV2WnR98"
                                externalNoIcon
                                className="font-bold not-italic text-red dark:text-yellow"
                            >
                                requests
                                <IconArrowUpRight className="inline-block size-4 align-text-bottom" />
                            </Link>
                        </span>
                    </div>
                    <p className="mb-3 leading-relaxed">
                        The gap between free and frontier went from “lol” to “wait…” real quick. For a big slice of
                        coding work, open source models now perform the same for a tenth of the price.
                    </p>
                    <p className="mb-6 leading-relaxed">
                        PostHog Desktop runs both. Pay token cost (with no markup) on the best tool for the job.
                    </p>

                    <div className="flex items-end justify-between gap-4">
                        <div className="leading-none">
                            <p className="m-0 text-3xl font-bold">
                                <RoughAnnotation
                                    type="circle"
                                    color="#F54E00"
                                    strokeWidth={3}
                                    padding={[10, 18]}
                                    iterations={3}
                                    delay={200}
                                >
                                    1/10th
                                </RoughAnnotation>
                            </p>
                            <p className="m-0 mt-1 text-2xl font-bold">
                                the price
                                <Tooltip
                                    delay={0}
                                    trigger={
                                        <sup className="ml-1 cursor-help text-base text-secondary hover:text-primary">
                                            *
                                        </sup>
                                    }
                                >
                                    Probably. You can run the numbers.
                                </Tooltip>
                            </p>
                            <p className="m-0 mt-3 text-xs font-semibold uppercase tracking-wide text-secondary">
                                For a lot of coding work
                            </p>
                        </div>
                        {/* Kaiju hedgehog fills the empty space beside the cost stat – hover to rampage */}
                        <MiniHogzilla className="hidden w-24 shrink-0 self-end @sm:block @xl:w-28" />
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes hogzilla-rampage {
                    0%, 100% { transform: scale(1.12) rotate(-4deg); }
                    25% { transform: scale(1.16) rotate(3deg); }
                    50% { transform: scale(1.12) rotate(-3deg); }
                    75% { transform: scale(1.16) rotate(2deg); }
                }
            `}</style>
        </section>
    )
}

export const MCPMarketplace = () => {
    return (
        <section className="relative mb-12 @xl:mb-16 px-4 @xl:px-8">
            <SectionLabel>MCP marketplace</SectionLabel>
            <p>Extend your agents with tools, data, and integrations.</p>

            {/* Cap the height and fade the bottom out with a mask so the list reads as "and more".
                A mask (not a bg-gradient overlay) fades the content itself to transparent, so it works
                over the translucent window background instead of painting a solid rectangle on top. */}
            <div className="mt-4 max-h-64 overflow-hidden [mask-image:linear-gradient(to_bottom,black_0%,black_calc(100%-6rem),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_calc(100%-6rem),transparent_100%)]">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 @sm:grid-cols-3 @lg:grid-cols-4 @2xl:grid-cols-6">
                    {mcpServers.map((server) => (
                        <div key={server.name} className="flex min-w-0 items-center gap-2">
                            <img
                                src={mcpServerIcon(server)}
                                alt=""
                                className="size-5 shrink-0 rounded object-contain"
                                loading="lazy"
                                aria-hidden
                            />
                            <p className="m-0 truncate text-sm font-semibold text-primary">{server.name}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

const skillsCalloutItems = [
    { label: 'Personal skills', desc: 'Your party tricks (nobody else needs to know).' },
    { label: 'Team skills', desc: '"How do we do X here", with version history.' },
    { label: 'Skills marketplace', desc: 'Someone already solved this. Take the win.' },
]

// Skills callout: BYOS, or steal ours. Sits right under the MCP marketplace list.
export const SkillsCallout = () => {
    return (
        <section className="relative mb-12 @xl:mb-16 px-4 @xl:px-8">
            <div className="rounded-md border border-purple bg-purple/10 p-6 shadow-xl @xl:p-8">
                <div className="mb-3 flex items-center gap-2">
                    <StickerRobot className="size-8 -rotate-3" />
                    <h2 className="m-0 text-2xl font-bold">Dang, PostHog's got skills</h2>
                </div>
                <p className="m-0 text-secondary">
                    PostHog Desktop loads the same skills Claude Code uses: from your machine, from the repo you are in,
                    and from any marketplace plugins you have installed. It also includes PostHog-maintained skills for
                    things like event capture, feature flags, experiments, and error tracking.
                </p>
                <div className="mt-5 grid grid-cols-1 gap-4 @sm:grid-cols-3">
                    {skillsCalloutItems.map(({ label, desc }) => (
                        <div key={label}>
                            <div className="flex items-center gap-1.5">
                                <IconSparkles className="size-5 shrink-0 text-purple" />
                                <span className="text-base font-bold text-primary">{label}</span>
                            </div>
                            <p className="m-0 mt-1 text-sm leading-snug text-secondary">{desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
