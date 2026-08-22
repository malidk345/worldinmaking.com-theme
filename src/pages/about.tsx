import React from 'react'
import Editor from 'components/Editor'
import SEO from 'components/seo'
import Link from 'components/Link'
import WimLogo from 'components/WimLogo'
import { buildAboutPageJsonLd, buildOrganizationJsonLd } from 'lib/seo'
import { useProfileData } from 'hooks/useProfileData'
import getAvatarURL from 'components/Squeak/util/getAvatar'

const ALI_DEFAULT_AVATAR = 'https://lh3.googleusercontent.com/a/ACg8ocKEDS7FCM1TQxBlTR1MVSaaSzkrckV_38IgKRcPsx4B-QFWQ5Q=s96-c'

export function AboutContent() {
    const { profile } = useProfileData('ali')
    const avatarUrl = getAvatarURL(profile) || (profile as any)?.avatar_url || (profile as any)?.attributes?.avatar?.data?.attributes?.url || ALI_DEFAULT_AVATAR
    const authorName = (profile as any)?.first_name || (profile as any)?.attributes?.firstName || 'm. ali'

    return (
        <div className="min-h-full px-4 sm:px-6 md:px-8 py-8 bg-primary overflow-y-auto">
            <div className="max-w-2xl mx-auto pb-16 text-primary font-sans">
                
                {/* Centered Author Profile Header */}
                <header className="flex flex-col items-center justify-center text-center mb-6">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted font-mono">from</span>
                        <Link
                            href="/profile/ali"
                            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-border bg-accent/20 hover:bg-accent/35 transition-colors group no-underline text-primary"
                        >
                            <img
                                src={avatarUrl}
                                alt="ali"
                                className="size-5 rounded-full object-cover border border-border shrink-0 shadow-2xs group-hover:opacity-90 transition-opacity"
                            />
                            <span className="text-xs font-semibold text-primary group-hover:underline">
                                {authorName}
                            </span>
                        </Link>
                    </div>
                </header>

                {/* Centered & Larger Wim Logo */}
                <div className="flex justify-center mb-8">
                    <WimLogo className="size-14 text-primary" />
                </div>

                {/* Article Content in Exact Community Typography */}
                <div className="markdown prose dark:prose-invert prose-sm max-w-full min-w-0 text-primary text-[15px] leading-[1.5] [&_p]:leading-[1.5] [&_p]:mb-2.5 [&_p]:mt-0 [&_a]:font-semibold break-words">
                    <p>
                        <strong>worldinmaking (2024)</strong> is, admittedly, a somewhat bold name. I’ve always cared about ambitions being larger than what they can immediately justify. It sounds a little like the kind of bold declaration you might find in the manifesto of a revolutionary organization that hasn’t even gone on strike yet.
                    </p>

                    <p>
                        And yet, I still love the name.
                    </p>

                    <p>
                        Because alongside the highly engineered algorithms of techno-feudal lords - magnificent architectures built to serve neoliberal programs - I think we need to make spaces of our own. Spaces where intimate, strange, unfinished, and unruly thoughts can exist. Spaces that don’t need to be large, profitable, or backed by capital to be worth building.
                    </p>

                    <p>
                        When I first launched the site, I wrote something along these lines as a kind of{' '}
                        <Link
                            href="/posts/manifesto"
                            className="text-blue dark:text-blue-2 underline font-semibold hover:opacity-80 transition-opacity"
                        >
                            manifesto
                        </Link>
                        .
                    </p>

                    <p>
                        <strong>WIM is, essentially, a notebook for unfinished thought.</strong>
                    </p>

                    <p>
                        I’m not going to tell you why it is supposedly better than other notebook apps, or give you the usual list of features designed to convince you that you need yet another place to take notes. WIM is a notebook. But it is also a place where you can publish what you write.
                    </p>

                    <p>
                        <strong>The distinction is important.</strong>
                    </p>

                    <p>
                        Most publishing platforms are built around finished things: finished arguments, polished essays, formatted pages, thoughts that have already settled into something presentable. A notebook, on the other hand, is where thought is still happening.
                    </p>

                    <p>
                        <strong>WIM sits somewhere between the two.</strong>
                    </p>

                    <p>
                        It is a place where you can write publicly without pretending that every thought has already become an argument. A place for fragments, experiments, contradictions, unfinished ideas, strange observations, and things you are not entirely sure you believe yet.
                    </p>

                    <p>
                        <strong>Not just a place to store what you already think, but somewhere to discover what you think.</strong>
                    </p>

                    <h4 className="text-base font-bold text-primary !mt-6 !mb-2">
                        There are also bots wandering around the site.
                    </h4>

                    <p>
                        They take the form of philosophers, each carefully built to reflect, as much as possible, the philosopher whose name it carries. The selection is entirely subjective - they are philosophers I happen to like. Yes, Rand is one of them. No, she isn’t. I just wanted to leave some room for diversity.
                    </p>

                    <p>
                        I didn’t build the philosopher bots as a gimmick or a game. I wanted them to be useful.
                    </p>

                    <p>
                        They are AI assistants shaped by particular philosophical backgrounds, conceptual habits, and styles of writing. They can help you work through something you’ve written, approach an idea from an unfamiliar direction, or expand your writing beyond the habits you normally fall back on.
                    </p>

                    <p>
                        But they are also deliberately playful.
                    </p>

                    <blockquote className="!my-3 !py-1 !pl-3.5 !border-l-2 !border-border italic text-secondary">
                        “Sometimes a different voice is enough to reveal something you missed. Sometimes a strange perspective fills a gap in an argument. Sometimes you just want to see what Nietzsche would do with a paragraph you wrote at three in the morning.”
                    </blockquote>

                    <p>
                        That is what the bots are for.
                    </p>

                    <p>
                        <strong>I like them. I think you will too.</strong>
                    </p>

                    <h4 className="text-base font-bold text-primary !mt-6 !mb-2">
                        A desk of your own.
                    </h4>

                    <p>
                        You’ll also notice that WIM doesn’t look or feel like a standard content feed. It is built as a desktop workspace.
                    </p>

                    <p>
                        <strong>That is intentional.</strong>
                    </p>

                    <p>
                        Thinking and writing rarely happen in a single, linear column. You have a draft in the center, an excerpt in the corner, and a philosopher arguing with you in a window off to the side. The desktop interface is designed to treat writing as a spatial craft - giving you an actual work surface where multiple threads, notes, and conversations can sit side by side without infinite feeds, tab clutter, or notification noise pulling you away.
                    </p>

                    <p className="!mt-3 font-semibold text-primary">
                        A quiet, tactile operating system for thought.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function About() {
    return (
        <>
            <SEO
                title="about — worldinmaking"
                description="a notebook for unfinished thought, wandering philosopher bots, and a spatial desktop for writing in public."
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
                <AboutContent />
            </Editor>
        </>
    )
}
