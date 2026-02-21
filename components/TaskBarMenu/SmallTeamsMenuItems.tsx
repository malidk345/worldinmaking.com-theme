import { IconShieldPeople } from "@posthog/icons"
import React from 'react'

interface TeamNode {
    id: string
    name: string
    slug: string
    crest?: string
}

// Mock team data for Next.js compatibility
// TODO: Replace with actual API call to fetch team data
const mockTeams: TeamNode[] = [
    { id: '1', name: 'Engineering', slug: 'engineering', crest: '/images/teams/engineering.png' },
    { id: '2', name: 'Product', slug: 'product', crest: '/images/teams/product.png' },
    { id: '3', name: 'Design', slug: 'design', crest: '/images/teams/design.png' },
    { id: '4', name: 'Growth', slug: 'growth', crest: '/images/teams/growth.png' },
]

export function useSmallTeamsMenuItems() {
    // Sort teams alphabetically by name
    const sortedTeams = [...mockTeams].sort((a, b) => a.name.localeCompare(b.name))

    return [
        {
            type: 'item' as const,
            label: 'All teams',
            link: '/teams',
            icon: <IconShieldPeople className="size-4" />,
        },
        { type: 'separator' as const },
        ...sortedTeams.map(
            ({ name, slug }) => {
                return {
                    type: 'item' as const,
                    label: `${name} Team`,
                    link: `/teams/${slug}`,
                }
            }
        ),
    ]
}
