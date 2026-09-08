import { useRouter } from 'next/router'
import { CallToAction } from 'components/CallToAction'
import ClientPostMarkdown from 'components/Squeak/components/ClientPostMarkdown'
import { ZoomImage } from 'components/ZoomImage'
import SEO from 'components/seo'
import { buildArticleJsonLd, pageCanonical } from 'lib/seo'
import dayjs from 'dayjs'
import { useUser } from 'hooks/useUser'
import React, { useContext, useState, useEffect } from 'react'
import { PostsContext } from './Posts'
import Title from './Title'
import { useLayoutData } from 'components/Layout/hooks'
import Upvote from './Upvote'
import { Questions } from 'components/Squeak'
import { Contributors } from '../../templates/BlogPost'
import Link from 'components/Link'
import Avatar from 'components/Squeak/components/Avatar'
import { handleFromDisplayName } from 'lib/profile-path'

export const Post = ({ imageURL, title, date, authors, belowTitle, body, cta, transformImageUri }: any) => {
    return (
        <>
            <div className="mb-4">
                <div className="mb-4">
                    <Title className="text-primary dark:text-primary-dark">{title}</Title>
                    <div className="flex items-center gap-3 flex-wrap mt-1 mb-2">
                        <p className="!m-0 opacity-70 text-sm">{dayjs(date).format('MMM DD, YYYY')}</p>
                        {authors?.data?.length > 0 && (
                            <ul className="list-none m-0 p-0 flex flex-wrap gap-1.5">
                                {authors.data.map((author: any) => {
                                    const name =
                                        [author.attributes?.firstName, author.attributes?.lastName]
                                            .filter(Boolean)
                                            .join(' ') ||
                                        author.attributes?.name ||
                                        'Author'
                                    const avatarUrl =
                                        author.attributes?.avatar?.formats?.thumbnail?.url ||
                                        author.attributes?.avatar?.url ||
                                        ''
                                    const handle =
                                        author.attributes?.username ||
                                        author.attributes?.handle ||
                                        author.id ||
                                        (name ? handleFromDisplayName(name) || name : '')
                                    const href = handle
                                        ? `/profile/${encodeURIComponent(String(handle).replace(/^\/profile\//, ''))}`
                                        : ''
                                    return (
                                        <li key={author.id || name} className="!mb-0">
                                            <Link
                                                to={href || '#'}
                                                state={{ newWindow: true }}
                                                className="inline-flex items-center gap-1.5 p-0.5 pr-1.5 border border-primary rounded-full bg-primary !no-underline hover:!underline cursor-pointer"
                                            >
                                                <Avatar image={avatarUrl || null} className="size-6" />
                                                <span className="text-sm font-semibold truncate max-w-[12rem]">
                                                    {name}
                                                </span>
                                            </Link>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </div>
                    {belowTitle?.()}
                </div>
                {imageURL && (
                    <ZoomImage>
                        {imageURL?.endsWith('.mp4') ? (
                            <video className="max-w-full max-h-96 rounded-md" autoPlay src={imageURL} />
                        ) : (
                            <img className="max-w-full max-h-96 rounded-md" src={imageURL} />
                        )}
                    </ZoomImage>
                )}
            </div>
            <div className="my-2 article-content">
                <ClientPostMarkdown transformImageUri={transformImageUri}>{body}</ClientPostMarkdown>
            </div>
            {cta?.label && cta?.url && (
                <CallToAction size="md" type="outline" externalNoIcon to={cta.url}>
                    {cta.label}
                </CallToAction>
            )}
        </>
    )
}

export default function ClientPost({
    id,
    title,
    featuredImage,
    date,
    body,
    CTA,
    publishedAt,
    post_category,
    excerpt,
    getPost,
    authors,
    slug,
    post_tags,
}: {
    title: string
    featuredImage?: { url: string }
    date: string
    body: string
    CTA?: { url: string; label: string }
    publishedAt: string
    post_category: { data: { id?: number | string; attributes?: any } }
    id: number | string
    excerpt: string
    getPost: () => Promise<void>
    authors: any
    slug: string
    post_tags: { data: { id?: number | string; attributes?: any }[] }
}) {
    const router = useRouter()
    const [location, setLocation] = useState(() => {
        const asPath = router?.asPath || ''
        const pathname = asPath.split('?')[0].split('#')[0] || '/'
        return { pathname }
    })

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setLocation({
                pathname: window.location.pathname,
            })
        }
    }, [router?.asPath])
    const pathname = location?.pathname || ''
    const { fullWidthContent } = useLayoutData()
    const { mutate } = useContext(PostsContext)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const { getJwt, isModerator } = useUser()
    const handleDeletePost = async () => {
        if (!confirmDelete) {
            setConfirmDelete(true)
            return
        }
        // WIM: posts live in Supabase; Squeak CMS delete is disabled
        const host = process.env.NEXT_PUBLIC_SQUEAK_API_HOST
        if (!host) {
            setConfirmDelete(false)
            return
        }
        await fetch(`${host}/api/posts/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${await getJwt()}`,
            },
        })
        await mutate?.()
        router.push('/posts')
    }
    const author = authors?.data?.[0]
    const authorName =
        author?.attributes?.name ||
        author?.attributes?.firstName ||
        author?.attributes?.username ||
        (typeof author === 'string' ? author : undefined)
    const imageURL = featuredImage?.url
    const publishedTime = publishedAt || date
    const modifiedTime = date || publishedAt
    const canonicalUrl = pageCanonical(`/posts/${slug}`)
    const articleSchema = buildArticleJsonLd({
        title,
        description: excerpt || title,
        url: canonicalUrl,
        image: imageURL,
        datePublished: publishedTime,
        dateModified: modifiedTime,
        author: authorName,
        keywords: post_tags?.data?.map((t) => t.attributes?.label || t.attributes?.name || '').filter(Boolean),
        wordCount: body ? body.split(/\s+/).filter(Boolean).length : undefined,
    })

    return (
        <div className="@container">
            <div className="flex flex-col-reverse @3xl:flex-row">
                <div className={`article-content flex-1 transition-all md:pt-8 w-full overflow-auto`}>
                    <div
                        className={`mx-auto transition-all ${
                            fullWidthContent ? 'max-w-full' : 'max-w-3xl'
                        }  md:px-8 2xl:px-12`}
                    >
                        <SEO
                            title={title}
                            description={excerpt || title}
                            article
                            image={imageURL}
                            canonicalUrl={canonicalUrl}
                            publishedTime={publishedTime}
                            modifiedTime={modifiedTime}
                            authorName={authorName}
                            structuredData={articleSchema}
                        />
                        <article>
                            <Post
                                imageURL={imageURL}
                                title={title}
                                date={date || publishedAt}
                                authors={authors}
                                belowTitle={() =>
                                    isModerator ? (
                                        <div className="mt-2 text-sm inline-flex space-x-2 text-muted">
                                            <Link
                                                state={{
                                                    id,
                                                    initialValues: {
                                                        title,
                                                        category: post_category?.data,
                                                        body,
                                                        images: [],
                                                        tags: post_tags?.data,
                                                        excerpt,
                                                    },
                                                }}
                                                to={`/posts/${id}/edit`}
                                                className="text-red dark:text-yellow font-semibold"
                                            >
                                                Edit post
                                            </Link>
                                            <span>|</span>
                                            <button onClick={handleDeletePost} className="text-red font-semibold">
                                                {confirmDelete ? 'Click again to confirm' : 'Delete post'}
                                            </button>
                                        </div>
                                    ) : null
                                }
                                body={body}
                                cta={CTA}
                            />
                            <Upvote slug={slug} id={id} className="mt-6" />
                            <div className={`mt-12 mx-auto pb-20 ${fullWidthContent ? 'max-w-full' : 'max-w-4xl'}`}>
                                <Questions
                                    disclaimer={false}
                                    subject={false}
                                    buttonText="Leave a comment"
                                    slug={pathname}
                                />
                            </div>
                        </article>
                    </div>
                </div>
                <aside
                    className={`shrink-0 basis-72 @3xl:reasonable:sticky @3xl:reasonable:overflow-auto max-h-64 overflow-auto @3xl:max-h-[calc(100vh_-_108px)] @3xl:top-[108px] w-full border-x border-input pt-4 xl:block hidden`}
                >
                    <Upvote id={id} slug={slug} className="px-4 mb-4" />
                    {author && (
                        <Contributors
                            contributors={[
                                {
                                    profile_id: author.id,
                                    image:
                                        author.attributes?.avatar?.data?.attributes?.url ||
                                        author.attributes.gravatarURL,
                                    name: [author.attributes?.firstName, author.attributes?.lastName]
                                        .filter(Boolean)
                                        .join(' '),
                                },
                            ]}
                        />
                    )}
                </aside>
            </div>
        </div>
    )
}
