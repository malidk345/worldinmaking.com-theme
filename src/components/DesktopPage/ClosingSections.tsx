import React, { useEffect, useRef, useState } from 'react'
import { Accordion } from 'components/RadixUI/Accordion'
import Modal from 'components/RadixUI/Modal'
import WistiaEmbed from 'components/WistiaEmbed'
import CloudinaryImage from 'components/CloudinaryImage'
import Link from 'components/Link'
import OSButton from 'components/OSButton'
import { WaitlistForm } from 'components/WaitlistForm'
import { ChoppyReveal } from 'components/Code/ChoppyReveal'
import { RoughAnnotation } from 'components/Code/RoughAnnotation'
import { usePrefersReducedMotion } from 'components/Code/usePrefersReducedMotion'
import {
    StickerMayor,
    StickerPullRequest,
} from 'components/Stickers/Stickers'
import { SectionLabel, InlineIcon, PostHogCodeLogomark, Highlight } from './shared'

// The "meep" video – https://posthog.wistia.com/medias/v7t0y7ynmn
const MEEP_VIDEO_ID = 'v7t0y7ynmn'

// Notification copy — mimics a macOS "task finished" toast (see reference screenshot).
const MEEP_NOTIFICATION = {
    app: 'PostHog Desktop',
    body: 'meep.mov needs your input',
}

export function MeepNotification({ className = 'my-10 flex justify-center px-4 @xl:px-8' }: { className?: string }) {
    const ref = useRef<HTMLDivElement>(null)
    const [inView, setInView] = useState(false)
    const prefersReducedMotion = usePrefersReducedMotion()

    // Play the entry animation only once the toast scrolls into view (it lives far down the page).
    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined' || !ref.current) {
            setInView(true)
            return
        }
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true)
                    observer.disconnect()
                }
            },
            { threshold: 0.4 }
        )
        observer.observe(ref.current)
        return () => observer.disconnect()
    }, [])

    const animate = inView && !prefersReducedMotion

    return (
        <div className={className}>
            <div
                ref={ref}
                className="w-full max-w-sm"
                style={{
                    opacity: prefersReducedMotion ? 1 : animate ? undefined : 0,
                    animation: animate ? 'meep-attention 0.6s ease-out both' : undefined,
                }}
            >
                <Modal
                    title="meep.mov"
                    maxWidth={900}
                    autoHeight
                    trigger={
                        <button
                            type="button"
                            aria-label={`${MEEP_NOTIFICATION.app}: ${MEEP_NOTIFICATION.body} – play video`}
                            className="group block w-full cursor-pointer rounded-2xl border border-white/40 bg-white/80 p-3.5 text-left shadow-2xl backdrop-blur-xl transition hover:-translate-y-0.5 active:translate-y-0 dark:border-white/10 dark:bg-black/50"
                        >
                            <div className="flex items-center gap-3">
                                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-[#1d1f27]">
                                    <PostHogCodeLogomark className="w-7" />
                                </span>
                                <div className="min-w-0">
                                    <p className="m-0 font-bold leading-tight text-primary">{MEEP_NOTIFICATION.app}</p>
                                    <p className="m-0 truncate leading-tight text-secondary">
                                        {MEEP_NOTIFICATION.body}
                                    </p>
                                </div>
                            </div>
                        </button>
                    }
                >
                    <div className="bg-primary p-2">
                        <WistiaEmbed mediaId={MEEP_VIDEO_ID} autoPlay />
                    </div>
                </Modal>
            </div>
            <style>{`
                @keyframes meep-attention {
                    0%   { opacity: 0; transform: translateY(-8px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}

export const BiggerPictureSection = () => {
    return (
        <section className="relative mb-12 @xl:mb-16 px-4 @xl:px-8">
            <SectionLabel>
                <InlineIcon icon={StickerMayor} className="!size-10 !top-3 -rotate-1">
                    Congratulations
                </InlineIcon>{' '}
                on your promotion
            </SectionLabel>

            <p className="text-base leading-loose">
                <ChoppyReveal wordDelay={40}>
                    {'You used to write code. Then you prompted outputs. Now you orchestrate '}
                    <Highlight>outcomes</Highlight>
                    {". PostHog Desktop is built for the abstraction level you're moving to next – and the work that "}
                    <RoughAnnotation type="underline" color="#F54E00" strokeWidth={2}>
                        <em>isn't quite possible yet</em>
                    </RoughAnnotation>
                    {" (but you'll probably be doing soon)."}
                </ChoppyReveal>
            </p>
        </section>
    )
}

export const InboxCallout = () => {
    return (
        <section className="relative mb-12 @xl:mb-16 px-4 @xl:px-8">
            <div className="relative overflow-hidden rounded-md border border-yellow bg-gradient-to-br from-yellow/25 via-yellow/10 to-orange/10 shadow-xl">
                <div className="grid gap-6 p-6 @2xl:grid-cols-2 @2xl:items-center @2xl:gap-10 @2xl:p-8">
                    <div>
                        <div className="mb-4 flex items-center gap-2">
                            <StickerPullRequest className="size-8 -rotate-3" />
                            <h2 className="m-0 text-2xl font-bold">Part of the self-driving loop</h2>
                        </div>
                        <ul className="m-0 mb-6 list-none space-y-3 p-0">
                            <li>
                                <strong>PostHog Desktop</strong> is where you do the work – run and steer agents, solo
                                or with your team.
                            </li>
                            <li>
                                <Link
                                    to="/slack"
                                    state={{ newWindow: true }}
                                    className="font-bold text-red dark:text-yellow"
                                >
                                    Slack
                                </Link>{' '}
                                is where you talk it through – tag{' '}
                                <code className="border-blue bg-blue/10">@PostHog</code> to ship without leaving the
                                thread.
                            </li>
                            <li>
                                <Link
                                    to="/products"
                                    state={{ newWindow: true }}
                                    className="font-bold text-red dark:text-yellow"
                                >
                                    Web
                                </Link>{' '}
                                and{' '}
                                <Link
                                    to="/mcp"
                                    state={{ newWindow: true }}
                                    className="font-bold text-red dark:text-yellow"
                                >
                                    MCP
                                </Link>{' '}
                                are how you ship from anywhere – clicky dashboards for humans, an agent-native surface
                                for everything else. PostHog can ship without you too (that's the self-driving part).
                            </li>
                        </ul>
                        <OSButton asLink to="/self-driving" state={{ newWindow: true }} variant="primary" size="md">
                            How self-driving works
                        </OSButton>
                    </div>

                    <div className="relative">
                        <p className="mb-5 text-center text-sm text-secondary">
                            Finally, an{' '}
                            <Link
                                to="/docs/self-driving/inbox"
                                state={{ newWindow: true }}
                                className="font-bold text-primary underline"
                            >
                                inbox
                            </Link>{' '}
                            you look forward to opening. Product signals go in, PRs come out.
                        </p>
                        <CloudinaryImage
                            src="https://res.cloudinary.com/dmukukwp6/image/upload/inbox_light_9aa9eed335.png"
                            alt="The Inbox surfacing reports and pull requests in PostHog Desktop"
                            className="dark:hidden w-full rounded border border-primary shadow-2xl"
                        />
                        <CloudinaryImage
                            src="https://res.cloudinary.com/dmukukwp6/image/upload/inbox_dark_216a157762.png"
                            alt="The Inbox surfacing reports and pull requests in PostHog Desktop"
                            className="hidden dark:block w-full rounded border border-primary shadow-2xl"
                        />
                    </div>
                </div>

                {/* Hogzilla banner anchored to the bottom-right of the box, on top of everything */}
                <CloudinaryImage
                    src="https://res.cloudinary.com/dmukukwp6/image/upload/self_driving_banner_fde531c7fb.png"
                    alt=""
                    className="absolute bottom-0 right-0 z-20 w-72 @lg:w-96 @2xl:w-[32rem]"
                    imgClassName="w-full"
                />
            </div>
        </section>
    )
}

/** Closing CTA. `ready` is reserved for sequencing with PostHogWaySection (kept for API parity). */
export const TLDR = (_props?: { ready?: boolean }) => {
    return (
        <section className="relative mb-12 @xl:mb-16 px-4 @xl:px-8">
            <h2 className="text-2xl font-bold mb-2">Try it</h2>
            <p className="m-0">PostHog Desktop is launching in Summer 2026.</p>
            <div className="mt-2 grid items-center gap-8 @2xl:grid-cols-2 @2xl:gap-12">
                <div className="@container bg-blue/10 border border-blue rounded-md px-8 py-6 shadow-xl">
                    <WaitlistForm />
                </div>
                <div>
                    <MeepNotification className="mb-5 flex justify-center @2xl:justify-start" />
                    <CloudinaryImage
                        src="https://res.cloudinary.com/dmukukwp6/image/upload/evolution_of_build_mode_0bdd109b00.png"
                        alt="The evolution of build mode"
                        className="w-full"
                        imgClassName="w-full"
                    />
                </div>
            </div>
        </section>
    )
}

const FAQ_ITEMS = [
    {
        trigger: 'What is PostHog Desktop?',
        content: (
            <div className="space-y-3">
                <p>
                    PostHog Desktop is a{' '}
                    <a href="/docs/posthog-desktop" className="underline">
                        desktop coding agent
                    </a>{' '}
                    that understands your product and business, not just your source code. It picks up work from product
                    signals – errors, support tickets, session replays, GitHub issues, Linear, Zendesk – researches the
                    causes, and ships pull requests for you to review.
                </p>
                <p>
                    You can also drive it manually like a regular coding agent: open a{' '}
                    <a href="/docs/posthog-desktop/tasks" className="underline">
                        task
                    </a>
                    , describe what you want, and watch it work. Run tasks locally, in an isolated{' '}
                    <a href="/docs/posthog-desktop/worktrees" className="underline">
                        worktree
                    </a>
                    , or in a{' '}
                    <a href="/docs/posthog-desktop/cloud-runs" className="underline">
                        PostHog-managed cloud sandbox
                    </a>
                    .
                </p>
            </div>
        ),
    },
    {
        trigger: "Wait, wasn't this called PostHog Code?",
        content: (
            <div className="space-y-3">
                <p>
                    Yep, we renamed it. Writing code turned out to be just one part of building a product – so we added
                    things like canvases and multiplayer to make room for the rest of the work.
                </p>
            </div>
        ),
    },
    {
        trigger: "What's the difference between PostHog AI and PostHog Desktop?",
        content: (
            <div className="space-y-3">
                <p>
                    PostHog AI is the product assistant built into PostHog Web. It's deeply integrated with your data
                    and helps with things like writing SQL and analyzing user behavior through natural-language prompts.
                </p>
                <p>
                    PostHog Desktop is a desktop app focused on shipping code. It orchestrates multiple coding agents
                    from different providers (Anthropic, OpenAI) and turns product signals – errors, support tickets,
                    session replay trends – into PRs.
                </p>
                <p>
                    In a nutshell:{' '}
                    <strong>PostHog AI helps you understand your product. PostHog Desktop helps you build it.</strong>
                </p>
            </div>
        ),
    },
    {
        trigger: 'Why is PostHog building a coding agent?',
        content: (
            <div className="space-y-3">
                <p>
                    The latest generation of AI-powered coding agents are remarkably capable at writing code. But
                    there's a problem: they have <em>no idea what your product is or what your users need.</em>
                </p>
                <p>
                    <strong>That context already lives in PostHog</strong>. When your product data and AI agents work
                    together, agents can automatically run analysis, fix bugs, and write pull requests so you can focus
                    on more high-value work.
                </p>
            </div>
        ),
    },
    {
        trigger: 'Does it replace Cursor or Claude Code?',
        content: (
            <div className="space-y-3">
                <p>
                    Yep! PostHog Desktop is a full coding agent – not just a plugin for another editor – so you can use
                    it as your primary tool for generating code.
                </p>
                <p>
                    If you'd rather keep your existing editor, you can still get the product-data layer: the PostHog MCP
                    server works with Cursor, Claude Code, Windsurf, and VS Code with Copilot.
                </p>
            </div>
        ),
    },
    {
        trigger: 'What models and editors does it work with?',
        content: (
            <div className="space-y-3">
                <p>
                    PostHog Desktop is built on top of two{' '}
                    <a href="/docs/posthog-desktop/use-any-model-and-harness" className="underline">
                        harnesses
                    </a>
                    : Claude Code and Codex. You can pick the harness, model, and reasoning effort per task.
                </p>
                <p>
                    If you'd rather keep your existing editor, the PostHog MCP server works with any MCP-compatible
                    agent, including Claude Code, Cursor, Windsurf, and VS Code with Copilot.
                </p>
            </div>
        ),
    },
    {
        trigger: "What if I don't use PostHog yet?",
        content: (
            <p>
                PostHog Desktop runs on top of PostHog, so you'll need to be on PostHog first. The good news: PostHog is
                free up to{' '}
                <a href="/start" className="underline">
                    generous limits
                </a>
                , and installation takes about 90 seconds with the wizard.
            </p>
        ),
    },
    {
        trigger: 'How does it decide what to work on?',
        content: (
            <div className="space-y-3">
                <p>
                    You can always just tell it what to do. But Code also has an Inbox: PostHog's{' '}
                    <a href="/self-driving" className="underline">
                        self-driving
                    </a>{' '}
                    layer watches your product, ranks what needs doing by importance, impact, and severity, and files it
                    as reports you can turn into a task in a click.
                </p>
                <p>
                    The full ranking, signal sources, and priority thresholds live in the{' '}
                    <a href="/docs/self-driving" className="underline">
                        self-driving docs
                    </a>{' '}
                    – Code is where you review and action what it surfaces.
                </p>
            </div>
        ),
    },
    {
        trigger: 'Where do tasks run – locally or in the cloud?',
        content: (
            <div className="space-y-3">
                <p>
                    <a href="/docs/posthog-desktop/tasks" className="underline">
                        Three modes
                    </a>
                    , picked per task:
                </p>
                <p>
                    <strong>Local</strong> runs in your current branch and working directory.{' '}
                    <a href="/docs/posthog-desktop/worktrees" className="underline">
                        <strong>Worktree</strong>
                    </a>{' '}
                    creates an isolated git worktree per task, so you can run several agents in parallel without
                    stepping on each other.{' '}
                    <a href="/docs/posthog-desktop/cloud-runs" className="underline">
                        <strong>Cloud</strong>
                    </a>{' '}
                    runs in a PostHog-managed sandbox that survives app restarts, sleeps, and network changes.
                </p>
                <p>
                    You can hand a task off mid-flight – start in the cloud and pull it down to local to finish, or vice
                    versa. The full conversation history and any uncommitted changes come with it.
                </p>
            </div>
        ),
    },
    {
        trigger: 'Is my code sent to PostHog?',
        content: (
            <div className="space-y-3">
                <p>
                    Your code stays in GitHub. PostHog Desktop agents access your repo to open PRs, much like any CI/CD
                    integration.
                </p>
                <p>
                    The local{' '}
                    <a href="/docs/posthog-desktop/posthog-integration" className="underline">
                        enricher
                    </a>{' '}
                    uses tree-sitter to detect PostHog SDK calls right on your machine – no source code is uploaded for
                    that.{' '}
                    <a href="/docs/posthog-desktop/cloud-runs" className="underline">
                        Cloud tasks
                    </a>{' '}
                    run in a PostHog-managed sandbox with configurable network rules (trusted allowlist, full internet,
                    or custom).
                </p>
            </div>
        ),
    },
    {
        trigger: 'Is my PostHog data safe?',
        content: (
            <p>
                Yes. PostHog Desktop queries your data through the PostHog API using your personal API key. Data is
                never stored, cached, or sent anywhere other than to PostHog&apos;s servers, and you control exactly
                what the agent can access through your API key&apos;s permissions.
            </p>
        ),
    },
    {
        trigger: 'Can it modify my PostHog configuration?',
        content: (
            <div className="space-y-3">
                <p>
                    Yes – PostHog Desktop can both read and write to PostHog, depending on your API key permissions. It
                    can create feature flags, set up experiments, build dashboards, and define actions.
                </p>
                <p>
                    Every write operation requires explicit approval from the agent's permission system – nothing
                    happens without your confirmation.
                </p>
            </div>
        ),
    },
    {
        trigger: 'How much does it cost?',
        content: (
            <div className="space-y-3">
                <p>
                    PostHog Desktop is usage-based – there's no fixed subscription. You spend AI credits as you go (100
                    credits = $1), and credits reflect the underlying model's cost exactly, with no markup on top.
                </p>
                <p>
                    Every organization gets a $20/month free tier to explore, plus a default $50 billing limit so you
                    don't rack up costs by accident (customize it anytime). Simple tasks use very few credits; larger,
                    multi-file work uses more. See the{' '}
                    <a href="/docs/posthog-desktop/pricing" className="underline">
                        pricing docs
                    </a>{' '}
                    for the full breakdown.
                </p>
                <p>
                    If your agents did nothing this month, you pay nothing this month. (Imagine Anthropic saying that.)
                </p>
            </div>
        ),
    },
    {
        trigger: 'Is it open source?',
        content: (
            <p>
                <a href="/docs/posthog-desktop/open-source" className="underline">
                    Yes – MIT licensed
                </a>
                , with the monorepo{' '}
                <a href="https://github.com/PostHog/code" className="underline">
                    on GitHub
                </a>
                . The desktop app, agent framework, enricher, and bundled skills all live there. macOS is officially
                supported; Windows is community-maintained.
            </p>
        ),
    },
]

export function FAQ() {
    return (
        <section className="mb-12 @xl:mb-16 px-4 @xl:px-8">
            <h2 className="text-2xl font-bold m-0 mb-6">Frequently asked questions</h2>

            <Accordion
                type="multiple"
                triggerClassName="!px-3 !py-2"
                contentClassName="!px-3 !py-2.5 !text-base !leading-relaxed"
                items={FAQ_ITEMS}
            />
        </section>
    )
}

export function DownloadButton() {
    return (
        <div className="py-6">
            <WaitlistForm />
        </div>
    )
}
