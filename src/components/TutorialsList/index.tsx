import ResourceItem from 'components/Docs/ResourceItem'
import React from 'react'
import Link from 'components/Link'

export default function TutorialsList({ topic, slugs }: { topic?: string; slugs?: string[] }): any {
    const {
        allMdx: { nodes },
    } = {}
    const tutorials = nodes.filter((tutorial) => {
        return slugs
            ? slugs.includes(tutorial.fields.slug)
            : tutorial?.frontmatter?.tags?.some((tutorialTag) => tutorialTag === topic)
    })

    return (
        <ul className="">
            {tutorials.map(({ id, frontmatter: { title, featuredImage }, fields: { slug } }) => {
                return (
                    <li key={id}>
                        <Link href={slug} state={{ newWindow: true }}>
                            {/* gatsbyImage={featuredImage} */}
                            {title}
                        </Link>
                    </li>
                )
            })}
        </ul>
    )
}

