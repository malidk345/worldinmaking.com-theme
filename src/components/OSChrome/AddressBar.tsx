import React from 'react'
import { Select } from 'components/RadixUI/Select'

interface AddressBarProps {
  selectOptions: any[]
  currentPath: string
  handleValueChange: (value: string) => void
  selectedCategory?: string
}

export default function AddressBar({
  selectOptions,
  currentPath,
  handleValueChange,
  selectedCategory,
}: AddressBarProps) {
  return (
    <div data-scheme="secondary" className="bg-primary px-2 pb-2 border-b border-primary">
      <Select
        groups={selectOptions}
        placeholder="Select..."
        ariaLabel="Products"
        defaultValue={selectedCategory || currentPath}
        onValueChange={handleValueChange}
        className="w-full"
        dataScheme="primary"
      />
    </div>
  )
}
