import { Select } from 'components/RadixUI/Select'
import React from 'react'

export default function TeamFilter({ onChange, value }: { onChange: (value: string) => void; value: string }) {
    const data = {}
    const teams = data.allRoadmap.group.map((team: { fieldValue: string }) => ({
        label: team.fieldValue,
        value: team.fieldValue,
    }))
    return (
        <Select
            defaultValue={value}
            dataScheme="primary"
            onValueChange={(value) => {
                onChange(value)
            }}
            groups={[
                {
                    label: 'Team',
                    items: [{ label: 'All teams', value: 'all' }, ...teams],
                },
            ]}
        />
    )
}
