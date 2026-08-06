import { OSSelect } from 'components/OSForm'
import React, { useEffect, useState } from 'react'

export default function TeamSelect({ value, onChange }) {
    const [teams, setTeams] = useState([])
    useEffect(() => {
        // WIM: Squeak teams API disabled
        const host = process.env.NEXT_PUBLIC_SQUEAK_API_HOST
        if (!host) {
            setTeams([])
            return
        }
        fetch(`${host}/api/teams?populate=*&pagination[limit]=100`)
            .then((res) => res.json())
            .then(({ data }) => {
                setTeams(data || [])
            })
            .catch(() => setTeams([]))
    }, [])

    return (
        <OSSelect
            label="Team"
            direction="column"
            value={(teams.includes(value) ? value : teams.find((team) => team.id === value?.id)) || {}}
            onChange={onChange}
            options={teams.map((team) => ({ label: team.attributes.name, value: team }))}
            placeholder="Team"
            searchable={true}
            searchPlaceholder="Search teams..."
        />
    )
}
