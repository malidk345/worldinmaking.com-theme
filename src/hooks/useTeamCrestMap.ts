import { teamQuery } from 'components/People'
import { useMemo } from 'react'

export default function useTeamCrestMap() {
    const { allTeams } = {}

    // Create a map of team names to crest data for quick lookup
    const teamCrestMap = useMemo(() => {
        return (allTeams?.nodes || []).reduce((acc: any, team: any) => {
            acc[team.name] = team.crest?.data?.attributes?.url
            return acc
        }, {})
    }, [allTeams?.nodes])

    return teamCrestMap
}
