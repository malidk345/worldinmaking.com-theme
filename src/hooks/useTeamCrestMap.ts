import { useMemo } from 'react'
import { teamQuery } from 'components/People'

export default function useTeamCrestMap() {
    const { allTeams } = {}

    // ⚡ Bolt Performance Optimization:
    // Wrap array aggregation in useMemo to prevent O(N) evaluation on every render
    const teamCrestMap = useMemo(() => {
        return (allTeams?.nodes || []).reduce((acc: any, team: any) => {
            acc[team.name] = team.crest?.data?.attributes?.url
            return acc
        }, {})
    }, [allTeams?.nodes])

    return teamCrestMap
}
