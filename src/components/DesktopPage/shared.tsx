import React from 'react'
import SlotMachineText from 'components/SlotMachineText'
// Same asset path the page used pre-split (webpack resolves; tsc svg module noise is project-wide).
import posthogIcon from '../../images/posthog-icon-white.svg'
import { IconPop } from 'components/Code/IconPop'

export function SectionLabel({ children }: { children: React.ReactNode }) {
    return <h2 className="text-2xl font-bold mb-4">{children}</h2>
}

// ─────────────────────────────────────────────
// Inline icon helper (sits in text flow)
// ─────────────────────────────────────────────

export function InlineIcon({
    icon: Icon,
    children,
    className = '',
}: {
    icon: React.ComponentType<{ className?: string }>
    children?: React.ReactNode
    className?: string
}) {
    return (
        <span className="inline-flex items-baseline gap-0.5 whitespace-nowrap">
            <IconPop>
                <Icon className={`size-7 inline-block align-middle relative top-1.5 ${className}`} />
            </IconPop>
            {children}
        </span>
    )
}

// ─────────────────────────────────────────────
// Keyboard shortcut / badge style
// ─────────────────────────────────────────────

export function KeyBadge({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-sans font-medium align-middle mx-0.5 relative -top-0.5 bg-[#1d1f27] text-white dark:bg-white dark:text-[#1d1f27]">
            {children}
        </span>
    )
}

// "Let [icon] PostHog {analyze|debug|…|code}" — the animated wordmark, reused as the
// header brand and as the punch line at the end of the opening narrative.
export function LetPostHogScroller({ className = 'text-2xl @xl:text-3xl font-bold tracking-tight' }: { className?: string }) {
    return (
        <SlotMachineText
            className={className}
            words={['analyze', 'debug', 'instrument', 'ship', 'experiment', 'query', 'flag', 'code']}
            holdDuration={4000}
            wordClassName="text-red dark:text-yellow"
            prefix={
                <span className="inline-flex items-center gap-2">
                    <span>Let</span>
                    <img src={posthogIcon} alt="" aria-hidden className="size-6 rounded-md @xl:size-7" />
                    <span>PostHog</span>
                </span>
            }
        />
    )
}

export function PostHogCodeLogomark({ className }: { className?: string }) {
    return (
        <>
            <svg
                width="96"
                height="52"
                viewBox="0 0 96 52"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={`inline-block dark:hidden ${className}`}
            >
                <g id="Logo 3001">
                    <g id="Primative/Logomark" clipPath="url(#clip0_49_523)">
                        <path
                            id="head"
                            d="M92.7587 43.2867L92.1324 43.2112C90.2645 42.9736 88.5262 42.1098 87.2089 40.7494L61.7383 14.361V51.9353H90.88C93.6225 51.9353 95.8359 49.7111 95.8359 46.9794V46.785C95.8359 45.0035 94.5078 43.5027 92.7479 43.2867H92.7587ZM72.7082 43.6754C70.8835 43.6754 69.4043 42.1962 69.4043 40.3715C69.4043 38.5468 70.8835 37.0675 72.7082 37.0675C74.533 37.0675 76.0122 38.5468 76.0122 40.3715C76.0122 42.1962 74.533 43.6754 72.7082 43.6754Z"
                            fill="#111111"
                        />
                        <path
                            id="yellow-3"
                            d="M40.7488 51.9352H57.5277L40.7488 34.6705V51.9352Z"
                            fill="url(#paint0_linear_49_523)"
                        />
                        <path
                            id="yellow-2"
                            d="M40.749 14.188V34.6704L57.5279 51.9351H61.7496V35.7792L40.749 14.188Z"
                            fill="url(#paint1_linear_49_523)"
                        />
                        <path
                            id="yellow-1"
                            d="M61.7496 35.7932V14.3607L49.2572 1.51204C46.1584 -1.68393 40.749 0.518698 40.749 4.96715V14.1893L61.7496 35.7824V35.7932Z"
                            fill="url(#paint2_linear_49_523)"
                        />
                        <path
                            id="red-3"
                            d="M19.9209 51.9352H36.3543L19.9209 34.746V51.9352Z"
                            fill="url(#paint3_linear_49_523)"
                        />
                        <path
                            id="red-2"
                            d="M19.9209 13.2488V34.7461L36.3543 51.9353H40.7487V34.6705L19.9209 13.2488Z"
                            fill="url(#paint4_linear_49_523)"
                        />
                        <path
                            id="red-1"
                            d="M40.7487 14.188L28.4291 1.51204C25.3303 -1.68393 19.9209 0.518698 19.9209 4.96715V13.2619L40.7487 34.6703V14.188Z"
                            fill="url(#paint5_linear_49_523)"
                        />
                        <path
                            id="blue-3"
                            d="M0.000244141 47.1301C0.000244141 49.7837 2.15141 51.9348 4.80501 51.9348H16.5921L0.000244141 33.7204V47.1301Z"
                            fill="url(#paint6_linear_49_523)"
                        />
                        <path
                            id="blue-2"
                            d="M19.9206 34.7313V51.9348H16.5846L0 33.7271V13.9286L19.9206 34.7313Z"
                            fill="url(#paint7_linear_49_523)"
                        />
                        <path
                            id="blue-1"
                            d="M19.9209 13.2488L8.50821 1.51219C5.40941 -1.68378 0 0.518851 0 4.9673V13.929L19.9209 34.746V13.2488Z"
                            fill="url(#paint8_linear_49_523)"
                        />
                    </g>
                </g>
                <defs>
                    <linearGradient
                        id="paint0_linear_49_523"
                        x1="40.9368"
                        y1="35.0753"
                        x2="57.4652"
                        y2="51.892"
                        gradientUnits="userSpaceOnUse"
                    >
                        <stop stopColor="#FF9500" />
                        <stop offset="1" stopColor="#F8AA00" />
                    </linearGradient>
                    <linearGradient
                        id="paint1_linear_49_523"
                        x1="40.6533"
                        y1="14.777"
                        x2="61.815"
                        y2="51.8099"
                        gradientUnits="userSpaceOnUse"
                    >
                        <stop stopColor="#FFB700" />
                        <stop offset="1" stopColor="#F9AA01" />
                    </linearGradient>
                    <linearGradient
                        id="paint2_linear_49_523"
                        x1="40.6533"
                        y1="3.63932"
                        x2="61.815"
                        y2="34.8249"
                        gradientUnits="userSpaceOnUse"
                    >
                        <stop stopColor="#FFD849" />
                        <stop offset="0.955762" stopColor="#FBAE01" />
                    </linearGradient>
                    <linearGradient
                        id="paint3_linear_49_523"
                        x1="19.2128"
                        y1="36.4955"
                        x2="30.8465"
                        y2="51.8921"
                        gradientUnits="userSpaceOnUse"
                    >
                        <stop stopColor="#C42C00" />
                        <stop offset="1" stopColor="#D63600" />
                    </linearGradient>
                    <linearGradient
                        id="paint4_linear_49_523"
                        x1="19.7697"
                        y1="13.6632"
                        x2="42.0451"
                        y2="52.3668"
                        gradientUnits="userSpaceOnUse"
                    >
                        <stop stopColor="#EF3C00" />
                        <stop offset="1" stopColor="#D63601" />
                    </linearGradient>
                    <linearGradient
                        id="paint5_linear_49_523"
                        x1="19.9877"
                        y1="13.4537"
                        x2="40.7443"
                        y2="34.5947"
                        gradientUnits="userSpaceOnUse"
                    >
                        <stop stopColor="#FF651E" />
                        <stop offset="1" stopColor="#E4400A" />
                    </linearGradient>
                    <linearGradient
                        id="paint6_linear_49_523"
                        x1="0.000245783"
                        y1="35.13"
                        x2="17.1052"
                        y2="52.4272"
                        gradientUnits="userSpaceOnUse"
                    >
                        <stop stopColor="#0041C6" />
                        <stop offset="1" stopColor="#0045D0" />
                    </linearGradient>
                    <linearGradient
                        id="paint7_linear_49_523"
                        x1="-8.63173"
                        y1="25.6173"
                        x2="16.4323"
                        y2="51.8919"
                        gradientUnits="userSpaceOnUse"
                    >
                        <stop stopColor="#0255FF" />
                        <stop offset="1" stopColor="#0145D2" />
                    </linearGradient>
                    <linearGradient
                        id="paint8_linear_49_523"
                        x1="-9.46706"
                        y1="3.342"
                        x2="20.0479"
                        y2="36.1983"
                        gradientUnits="userSpaceOnUse"
                    >
                        <stop stopColor="#3F80FF" />
                        <stop offset="1" stopColor="#084FE0" />
                    </linearGradient>
                    <clipPath id="clip0_49_523">
                        <rect width="95.8469" height="51.9346" fill="white" />
                    </clipPath>
                </defs>
            </svg>

            <svg
                width="52"
                height="28"
                viewBox="0 0 52 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={`hidden dark:inline-block ${className}`}
            >
                <g id="Logo 3001">
                    <g id="Primative/Logomark" clipPath="url(#clip0_49_523)">
                        <path
                            id="head"
                            d="M50.0159 23.3375L49.6783 23.2967C48.6712 23.1687 47.734 22.703 47.0238 21.9695L35.5777 10.111C35.2654 9.7874 34.7179 10.0086 34.718 10.4583L34.7205 27.5003C34.7205 27.7764 34.9444 28.0003 35.2205 28.0003H49.003C50.4816 28.0003 51.6749 26.8011 51.6749 25.3283V25.2235C51.6749 24.263 50.9589 23.4539 50.0101 23.3375H50.0159ZM39.2059 23.547C38.2221 23.547 37.4246 22.7495 37.4246 21.7657C37.4246 20.782 38.2221 19.9845 39.2059 19.9845C40.1897 19.9845 40.9872 20.782 40.9872 21.7657C40.9872 22.7495 40.1897 23.547 39.2059 23.547Z"
                            fill="#FAFAFA"
                        />
                        <path
                            id="body-1"
                            d="M0 25.4097C0 26.8403 1.15978 28.0001 2.59044 28.0001H7.81351C8.24782 28.0001 8.47561 27.4845 8.18314 27.1634L0.869635 19.1347C0.562039 18.797 0 19.0146 0 19.4714V25.4097Z"
                            fill="#FAFAFA"
                        />
                        <path
                            id="body-2"
                            d="M18.8112 27.1542C19.1156 27.4722 18.8903 28 18.45 28H11.3645C11.2207 28 11.0838 27.9381 10.9889 27.83L8.94141 25.5L0.130295 15.8231C0.046462 15.731 0 15.611 0 15.4865V8.75485C0 8.30416 0.549419 8.08352 0.861129 8.40904L18.8112 27.1542Z"
                            fill="#FAFAFA"
                        />
                        <path
                            id="body-3"
                            d="M0 2.67783C3.31006e-05 0.279524 2.91624 -0.907535 4.58691 0.815527L30.1907 27.1515C30.4988 27.4684 30.2743 28 29.8322 28L22.0671 28.0001C21.9251 28.0001 21.7898 27.9398 21.695 27.8341L19.5996 25.5L0.277366 5.29997C0.0993537 5.11387 0 4.86627 0 4.60874V2.67783Z"
                            fill="#FAFAFA"
                        />
                        <path
                            id="body-4"
                            d="M10.7402 2.678C10.7402 0.279791 13.6564 -0.907946 15.3271 0.814714L32.5044 18.4803L33 18.99V19.29V26.2862C33 26.7326 32.4595 26.9552 32.1451 26.6383L31.0156 25.5L11.3064 5.23222C10.9434 4.85888 10.7402 4.35865 10.7402 3.8379V2.678Z"
                            fill="#FAFAFA"
                        />
                        <path
                            id="body-5"
                            d="M33.0078 7.45704V15.2688C33.0078 15.7176 32.4623 15.9391 32.1493 15.6174L22.5355 5.73224C22.1724 5.35889 21.9692 4.85863 21.9692 4.33784V2.67799C21.9692 0.279654 24.8857 -0.907872 26.5563 0.815205L33.0078 7.45704Z"
                            fill="#FAFAFA"
                        />
                    </g>
                </g>
                <defs>
                    <clipPath id="clip0_49_523">
                        <rect width="51.6748" height="28" fill="white" />
                    </clipPath>
                </defs>
            </svg>
        </>
    )
}

/** Small "Alpha" pill – marks still-cooking features inside the beta product. */
export const AlphaBadge = () => (
    <span className="shrink-0 rounded-sm bg-highlight px-1 py-0.5 text-xs font-bold text-red dark:text-yellow">
        Alpha
    </span>
)

/** Highlighter span, same treatment as the self-driving page. */
export const Highlight = ({ children }: { children: React.ReactNode }) => (
    <span className="bg-highlight px-0.5 font-bold text-red dark:text-yellow">{children}</span>
)

/** Model name pill – same treatment as the &lt;codebase /&gt; tag in "The old way" section. */
export const ModelChip = ({ children }: { children: React.ReactNode }) => (
    <code className="inline-flex items-center rounded-sm border border-blue bg-blue/10 px-1.5 py-1 font-mono font-bold leading-none not-italic">
        {children}
    </code>
)

/** Oversized easter-egg sticker. On hover the kaiju hedgehog rampages. */
export const MiniHogzilla = ({ className = '' }: { className?: string }) => (
    <div className={`group pointer-events-auto ${className}`}>
        <img
            src="https://res.cloudinary.com/dmukukwp6/image/upload/min_hogzilla_sticker_456e11eede.png"
            alt="Hogzilla, PostHog's mascot as a city-stomping kaiju"
            className="w-full origin-bottom transition-transform duration-300 group-hover:motion-safe:animate-[hogzilla-rampage_0.6s_ease-in-out_infinite]"
        />
    </div>
)
