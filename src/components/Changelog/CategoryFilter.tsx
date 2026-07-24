import { Select } from 'components/RadixUI/Select'
import React from 'react'

export default function CategoryFilter({ onChange, value }: { onChange: (value: string) => void; value: string }) {
    const data = {}
    const categories = data.allRoadmap.group.map((category: { fieldValue: string }) => ({
        label: category.fieldValue,
        value: category.fieldValue,
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
                    label: 'Category',
                    items: [{ label: 'All categories', value: 'all' }, ...categories],
                },
            ]}
        />
    )
}
