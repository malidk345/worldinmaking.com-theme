import { teamQuery } from 'components/People'

export default function useTeamCrestMap() {
    const { allTeams } = {}

    // Create a map of team names to crest data for quick lookup
    const teamCrestMap = Object.fromEntries(
        (allTeams?.nodes || []).map((team: any) => [team.name, team.crest?.data?.attributes?.url])
    )

    return teamCrestMap
}
