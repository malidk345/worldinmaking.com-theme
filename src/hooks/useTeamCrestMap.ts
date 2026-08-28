import { useMemo } from 'react'
import { teamQuery } from 'components/People'

export default function useTeamCrestMap() {
    const { allTeams } = {}

    // ⚡ Bolt: Create a map of team names to crest data for quick lookup and memoize it to avoid O(N) re-allocation on every render.
    const teamCrestMap = useMemo(() => {
        return (allTeams?.nodes || []).reduce((acc: any, team: any) => {
            acc[team.name] = team.crest?.data?.attributes?.url
            return acc
        }, {})
    }, [allTeams?.nodes])

    return teamCrestMap
}
