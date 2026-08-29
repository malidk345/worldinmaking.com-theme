import { teamQuery } from 'components/People'
import { useMemo } from 'react'

export default function useTeamCrestMap() {
    const { allTeams } = {}

    // Bolt Performance: Memoize map of team names to crest data for quick lookup to prevent O(N) recalculation on every render
    const teamCrestMap = useMemo(() => {
        return (allTeams?.nodes || []).reduce((acc: any, team: any) => {
            acc[team.name] = team.crest?.data?.attributes?.url
            return acc
        }, {})
    }, [allTeams])

    return teamCrestMap
}
