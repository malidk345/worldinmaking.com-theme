import React, { useRef, useState } from 'react'
import { IconCheck, IconX } from '@posthog/icons'
import { ChoppyReveal } from 'components/Code/ChoppyReveal'
import { RoughAnnotation } from 'components/Code/RoughAnnotation'
import { SignalsCallout } from 'components/Code/SignalsCallout'
import { DottedConnection } from 'components/Code/DottedConnection'
import { StickerTombstone } from 'components/Stickers/Stickers'
import { SectionLabel, InlineIcon, KeyBadge, PostHogCodeLogomark } from './shared'

const RECEIPT_PAPER = '#f7f4ee'

// A torn/zigzag paper edge. Flush along the top, sawtooth teeth pointing down.
// preserveAspectRatio="none" stretches a fixed tooth count across the receipt width.
export function TornEdge({ className = '' }: { className?: string }) {
    const width = 200
    const height = 12
    const teeth = 20
    const step = width / teeth
    let d = `M0 0 H${width}`
    for (let i = 0; i <= teeth; i++) {
        const x = (width - i * step).toFixed(1)
        const y = i % 2 === 0 ? height : 0
        d += ` L${x} ${y}`
    }
    d += ' Z'
    return (
        <svg
            className={className}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            aria-hidden
            focusable="false"
        >
            <path d={d} fill={RECEIPT_PAPER} />
        </svg>
    )
}

export function ReceiptRow({ label, price = '$0.00' }: { label: string; price?: string }) {
    return (
        <div className="flex items-baseline justify-between gap-4">
            <span>{label}</span>
            <span>{price}</span>
        </div>
    )
}

export function AgentMartReceipt() {
    return (
        <div className="mx-auto w-full max-w-xs rotate-1">
            <div
                className="font-code text-sm leading-relaxed shadow-2xl px-6 pt-6 pb-5 text-[#2b2b2b]"
                style={{ backgroundColor: RECEIPT_PAPER }}
            >
                <p className="m-0 text-center font-bold tracking-widest">TABLE STAKES 2026</p>
                <p className="m-0 mb-4 text-center text-xs italic text-[#8a8272]">(yep, PostHog has that)</p>

                <div className="space-y-1">
                    <ReceiptRow label="parallel agents" />
                    <ReceiptRow label="multi model" />
                    <ReceiptRow label="MCP servers" />
                    <ReceiptRow label="code diffs" />
                    <ReceiptRow label="cloud sandboxes" />
                    <ReceiptRow label="AI sparkles" />
                </div>

                <div className="my-3 border-t border-dashed border-[#c9c2b4]" />

                <div className="flex items-baseline justify-between gap-4 font-bold">
                    <span>TOTAL</span>
                    <span>$0.00</span>
                </div>

                <p className="m-0 mt-4 text-center text-xs text-[#8a8272]">thanks for shopping at agent mart</p>
            </div>
            <TornEdge className="w-full h-3" />
        </div>
    )
}

export function OldWaySection() {
    const tableStakes = [
        { text: "You're using Claude Code, Codex, or another agent to prompt real engineering work", checked: true },
        { text: "You've got the PostHog MCP wired into your editor, terminal, maybe your CI", checked: true },
        { text: "Running a handful of agents in parallel doesn't even feel like a flex anymore", checked: false },
        { text: 'Every session starts cold, no memory of the last decision or PR', checked: false },
        { text: "You're still the one watching the rollout and catching regressions", checked: false },
    ]

    return (
        <section className="relative mb-12 @xl:mb-16 px-4 @xl:px-8">
            <SectionLabel>
                The{' '}
                <InlineIcon icon={StickerTombstone} className="!size-10 !top-3 -rotate-1">
                    old way
                </InlineIcon>{' '}
                to build with AI
            </SectionLabel>

            <p className="text-base leading-loose mb-8">
                <ChoppyReveal wordDelay={40}>
                    {'Most AI code editors '}
                    <em>lack context</em>
                    {'. They use your '}
                    <strong className="font-mono bg-blue/10 border border-blue rounded-sm px-1 leading-normal inline-block">
                        &lt;codebase /&gt;
                    </strong>
                    {' as the source of truth and wait for '}
                    <RoughAnnotation type="underline" color="currentColor" strokeWidth={1.5}>
                        <em>you</em>
                    </RoughAnnotation>
                    {' to hit '}
                    <KeyBadge>
                        Build <span className="relative top-px">↵</span>
                    </KeyBadge>
                    {' – not how '}
                    <RoughAnnotation type="underline" color="#30A46C" strokeWidth={2}>
                        <em>people actually use your product</em>
                    </RoughAnnotation>
                    {'.'}
                </ChoppyReveal>
            </p>

            {/* Table stakes + receipt: the standard starter pack every AI tool ships (also the "old way") */}
            <div className="mt-8 grid items-start gap-8 @2xl:grid-cols-2 @2xl:gap-12">
                <div>
                    <h3 className="mb-3 text-lg font-bold text-primary">Sound familiar?</h3>
                    <ul className="m-0 list-none space-y-2.5 p-0">
                        {tableStakes.map(({ text, checked }) => (
                            <li key={text} className="flex items-start gap-2.5">
                                {checked ? (
                                    <IconCheck className="relative top-0.5 size-5 shrink-0 text-green" />
                                ) : (
                                    <IconX className="relative top-0.5 size-5 shrink-0 text-red" />
                                )}
                                <span className="text-base">{text}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="@2xl:pl-4">
                    <div className="relative mx-auto w-full max-w-xs">
                        {/* Lemon hog tucked behind the receipt's upper-right corner, peeking out */}
                        <img
                            src="https://res.cloudinary.com/dmukukwp6/image/upload/lemon_9cb7b3a156.png"
                            alt=""
                            aria-hidden
                            className="pointer-events-none absolute -right-20 top-8 z-0 w-28 rotate-12 @xl:w-32"
                        />
                        <div className="relative z-10">
                            <AgentMartReceipt />
                        </div>
                        {/* Banana hog lounging on top of the receipt's bottom-left */}
                        <img
                            src="https://res.cloudinary.com/dmukukwp6/image/upload/banana_relax_83149feac6.png"
                            alt="A hedgehog relaxing with a banana"
                            className="pointer-events-none absolute -bottom-10 -left-20 z-20 w-32 @xl:w-36"
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}

export function PostHogWaySection({ onComplete }: { onComplete?: () => void }) {
    const [p1Done, setP1Done] = useState(false)
    const [p2Done, setP2Done] = useState(false)
    const signalsWordRef = useRef<HTMLSpanElement>(null)
    const signalsBoxRef = useRef<HTMLDivElement>(null)
    const sectionRef = useRef<HTMLDivElement>(null)

    return (
        <section ref={sectionRef} className="relative mb-12 @xl:mb-16 px-4 @xl:px-8">
            <SectionLabel>
                The <PostHogCodeLogomark className="-rotate-2 w-12 relative -top-0.5" /> PostHog way
            </SectionLabel>

            <div className="relative">
                {/* Signals callout – in DOM before paragraph so float-right works on desktop.
                    On mobile (no float), it falls in normal flow above the paragraph,
                    but we use flex + order to push it below the first paragraph. */}
                <div className="flex flex-col @2xl/editor:block">
                    <div
                        ref={signalsBoxRef}
                        className="order-2 mb-5 @2xl/editor:order-none @2xl/editor:float-right @2xl/editor:ml-6 @2xl/editor:my-4 @2xl/editor:w-[300px] @4xl/editor:w-[350px]"
                    >
                        <SignalsCallout />
                    </div>

                    <p className="text-base leading-loose mb-5 order-1">
                        <ChoppyReveal wordDelay={40} onComplete={() => setP1Done(true)}>
                            <strong>{' PostHog Desktop'}</strong>
                            {' reads '}
                            <span ref={signalsWordRef}>
                                <RoughAnnotation
                                    type="highlight"
                                    color="rgba(48, 164, 108, 0.2)"
                                    strokeWidth={1}
                                    padding={2}
                                    multiline
                                >
                                    <strong>signals</strong>
                                </RoughAnnotation>
                            </span>
                            {' from '}
                            <span className="text-green text-sm">&#9679;</span> <strong>production data</strong> and
                            ships improvements while you sleep.
                        </ChoppyReveal>
                    </p>
                </div>

                <p className="text-base leading-loose mb-5">
                    <ChoppyReveal wordDelay={25} initialDelay={p1Done ? 0 : 999999} onComplete={() => setP2Done(true)}>
                        {'Bring the big idea. Run '}
                        <RoughAnnotation type="box" color="currentColor" strokeWidth={1} padding={2}>
                            <strong className="inline-block">a fleet of agents</strong>
                        </RoughAnnotation>
                        {'. Watch your product thinking become shaped, shippable work.'}
                    </ChoppyReveal>
                </p>

                <p className="text-base leading-loose mb-5">
                    <ChoppyReveal wordDelay={25} initialDelay={p2Done ? 0 : 999999} onComplete={() => onComplete?.()}>
                        <strong>TL;DR:</strong> There are plenty of AI coding tools, but only one that{' '}
                        <RoughAnnotation type="underline" color="currentColor" strokeWidth={1.5} delay={400}>
                            <span className="inline-block">
                                knows your product like <strong>PostHog Desktop</strong>.
                            </span>
                        </RoughAnnotation>
                    </ChoppyReveal>
                </p>

                {/* Clear float */}
                <div className="clear-both" />

                {/* Dotted connection line */}
                <DottedConnection
                    sourceRef={signalsWordRef}
                    targetRef={signalsBoxRef}
                    containerRef={sectionRef}
                    desktopOnly
                />
            </div>
        </section>
    )
}
