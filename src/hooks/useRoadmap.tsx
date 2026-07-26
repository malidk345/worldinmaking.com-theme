interface GitHubPage {
    title: string
    html_url: string
    number: string
    closed_at: string
    reactions: {
        hooray: number
        heart: number
        eyes: number
        plus1: number
    }
}

interface Team {
    name: string
    roadmaps: Roadmap[]
}

export interface Roadmap {
    squeakId: number
    title: string
    description: string
    betaAvailable: boolean
    complete: boolean
    dateCompleted: string
    image?: {
        url: string
    }
    projectedCompletion: string
    githubPages: GitHubPage[]
}

type RoadmapData = {
    allSqueakTeam: {
        nodes: Team[]
    }
}

export const useRoadmap = (): Team[] => {
    const data = useStaticQuery<RoadmapData>(query)

    return (data?.allSqueakTeam?.nodes || [])
}

