import { useMemo } from 'react'
import { teamQuery } from 'components/People'

export default function useTeamCrestMap() {
    const { allTeams } = {}

    // Create a map of team names to crest data for quick lookup
    // ⚡ Bolt: Memoize team crest map to prevent O(N) object allocation on every render
    const teamCrestMap = useMemo(() => {
        return (allTeams?.nodes || []).reduce((acc: any, team: any) => {
            acc[team.name] = team.crest?.data?.attributes?.url
            return acc
        }, {})
    }, [allTeams?.nodes])

    return teamCrestMap
}
