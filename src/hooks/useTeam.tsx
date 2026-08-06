/**
 * Teams — Squeak feature. Empty stub for WIM so pages do not call dead hosts.
 */
import { useState } from 'react'

export default function useTeam({ slug }: { slug: string }) {
    const [team] = useState<any>(null)
    const [loading] = useState(false)

    return {
        team,
        loading,
        addTeamMember: async () => {},
        removeTeamMember: async () => {},
        handleTeamChange: async () => {},
        handleTeamUpdate: async () => {},
        handleTeamCrest: async () => {},
        slug,
    }
}
