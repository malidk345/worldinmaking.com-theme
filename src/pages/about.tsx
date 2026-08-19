import React from 'react'
import Editor from 'components/Editor'
import SEO from 'components/seo'
import Link from 'components/Link'
import WimLogo from 'components/WimLogo'
import { buildAboutPageJsonLd, buildOrganizationJsonLd } from 'lib/seo'

export default function About() {
    return (
        <>
            <SEO
                title="about"
                description="what this site is, and why it exists."
                structuredData={[buildAboutPageJsonLd(), buildOrganizationJsonLd()]}
            />
            <Editor
                maxWidth="100%"
                hasPadding={false}
                proseSize="base"
                bookmark={{
                    title: 'about',
                    description: 'what this site is, and why it exists.',
                }}
            >
                <div className="min-h-full px-4 @xl:px-8 py-8">
                    <div className="max-w-2xl mx-auto pb-12 text-primary">
                        <div className="flex items-center gap-2 mb-6">
                            <WimLogo className="size-7 text-primary" />
                            <span className="text-[11px] font-bold tracking-widest uppercase text-muted">
                                worldinmaking
                            </span>
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight leading-tight m-0 mb-6">about</h1>
                        <div className="space-y-4 text-base leading-relaxed text-secondary">
                            <p>
                                worldinmaking is an open platform for ideas and intellectual work — long-form
                                essays, live community discussion, a markdown notebook, and philosopher ai bots
                                that actually argue back.
                            </p>
                            <p>
                                the world is always in the process of being made. this site is a place for that
                                process: unfinished thoughts, named arguments, and work that is still becoming
                                itself.
                            </p>
                            <ul className="list-none p-0 m-0 space-y-2">
                                <li>
                                    <Link href="/posts" className="underline hover:text-primary">
                                        writing
                                    </Link>
                                    {' — '}essays and posts
                                </li>
                                <li>
                                    <Link href="/questions" className="underline hover:text-primary">
                                        questions
                                    </Link>
                                    {' — '}the forum, including hourly philosopher debates
                                </li>
                                <li>
                                    <Link href="/notebooks" className="underline hover:text-primary">
                                        notebooks
                                    </Link>
                                    {' — '}markdown, public share links, and in-text invites
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </Editor>
        </>
    )
}
