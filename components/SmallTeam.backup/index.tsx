import React from 'react'
import Tooltip from 'components/RadixUI/Tooltip'
import Link from 'components/Link'
import CloudinaryImage from 'components/CloudinaryImage'

export interface SmallTeamProps {
    slug: string
    children?: JSX.Element
    noMiniCrest?: boolean
    inline?: boolean
    className?: string
}

interface TeamData {
    id: string
    name: string
    tagline?: string
    slug: string
    crest?: string
    miniCrest?: string
}

// Mock team data for Next.js compatibility
// TODO: Replace with actual API call to fetch team data
const mockTeams: TeamData[] = [
    {
        id: '1',
        name: 'Engineering',
        slug: 'engineering',
        tagline: 'Building the future of product analytics',
        crest: '/images/teams/engineering.png',
        miniCrest: '/images/teams/engineering-small.png',
    },
    {
        id: '2',
        name: 'Product',
        slug: 'product',
        tagline: 'Creating products users love',
        crest: '/images/teams/product.png',
        miniCrest: '/images/teams/product-small.png',
    },
    {
        id: '3',
        name: 'Design',
        slug: 'design',
        tagline: 'Making beautiful experiences',
        crest: '/images/teams/design.png',
        miniCrest: '/images/teams/design-small.png',
    },
    {
        id: '4',
        name: 'Growth',
        slug: 'growth',
        tagline: 'Scaling our impact',
        crest: '/images/teams/growth.png',
        miniCrest: '/images/teams/growth-small.png',
    },
]

export default function SmallTeam({ slug, children, inline = false, noMiniCrest = false, className = '' }: SmallTeamProps): JSX.Element | null {
    const team = mockTeams.find((node: TeamData) => node.slug === slug)

    if (!team) {
        // If team not found, just return the children or slug as text
        return children ? children : <span>{slug}</span>
    }

    const miniCrestUrl = team.miniCrest
    const fullCrestUrl = team.crest

    // The invisible block is necessary to make sure we have the proper width
    // with the `relative inline-block` parent when we include a mini crest
    const triggerContent = (
        <span className="relative inline-block">
            <Link to={`/teams/${team.slug}`} className={`group text-primary ${className}`}>
                {!noMiniCrest && miniCrestUrl && (
                    <span className={`invisible max-h-4 inline-flex items-center gap-1.5 ${!inline && 'p-0.5 pr-1.5 border border-primary rounded-full'}`}>
                        <span className="h-6 shrink-0 rounded-full overflow-hidden">
                            <CloudinaryImage
                                src={miniCrestUrl}
                                alt={`${team.name} mini crest`}
                                className="size-5 shrink-0"
                            />
                        </span>
                        <span className="!text-sm text-red dark:text-yellow font-semibold inline-block truncate">
                            {children ? children : <>{team.name} Team</>}
                        </span>
                    </span>
                )}
                <span
                    className={`inline-flex items-center ${!noMiniCrest && miniCrestUrl
                        ? [
                            'absolute top-0 left-0 whitespace-nowrap gap-1.5',
                            !inline ? 'p-0.5 pr-1.5 border border-primary rounded-full' : '',
                        ].filter(Boolean).join(' ')
                        : ''
                        }`}
                >
                    {!noMiniCrest && miniCrestUrl && (
                        <CloudinaryImage
                            src={miniCrestUrl}
                            alt={`${team.name} mini crest`}
                            className="size-5 shrink-0"
                        />
                    )}
                    <span className={`!text-sm ${inline ? 'underline' : 'group-hover:underline'} font-semibold inline-block truncate`}>
                        {children ? children : <>{team.name} Team</>}
                    </span>
                </span>
            </Link>
        </span>
    )

    const tooltipContent = () => {
        return (
            <Link
                data-scheme="secondary"
                to={`/teams/${team.slug}`}
                className="no-underline pt-2 px-2 block max-w-60"
            >
                <div className="text-center max-w-xs flex flex-col items-center">
                    {fullCrestUrl && (
                        <div className="inline-block size-24 rounded-lg overflow-hidden p-2 mb-2">
                            <img
                                src={fullCrestUrl}
                                alt={`${team.name} crest`}
                                className="w-full h-full object-contain"
                            />
                        </div>
                    )}
                    <strong className="text-[15px]">{team.name} Team</strong>
                    {team.tagline && <em className="text-sm text-secondary mt-1 text-balance">{team.tagline}</em>}
                </div>
            </Link>
        )
    }

    return (
        <>
            <Tooltip content={tooltipContent()} delay={0}>
                {triggerContent}
            </Tooltip>
        </>
    )
}
