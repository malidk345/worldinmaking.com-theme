import { InlineCode } from 'components/InlineCode'
import React from 'react'

export const TutorialTags = () => {
    const { data } = {}

    return (
        <ul className="list-none m-0 p-0 mt-1">
            {data.tags?.map((item) => {
                return (
                    <li key={item.fieldValue}>
                        <InlineCode>{item.fieldValue}</InlineCode>
                    </li>
                )
            })}
        </ul>
    )
}

