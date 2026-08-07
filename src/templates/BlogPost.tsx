import { MDXProvider } from '@mdx-js/react'
import { Blockquote } from 'components/BlockQuote'
import { InlineCode } from 'components/InlineCode'
import Link from 'components/Link'
import { Contributor } from 'components/PostLayout/Contributors'
import { SEO, type LanguageAlternate } from 'components/seo'
import { ZoomImage } from 'components/ZoomImage'
import CloudinaryImage from 'components/CloudinaryImage'
import React, { useEffect, useMemo, useState } from 'react'
import { MdxCodeBlock } from 'components/CodeBlock'
import { shortcodes } from '../../src/mdxGlobalComponents'
import { Heading } from 'components/Heading'
import TutorialsSlider from 'components/TutorialsSlider'
import TutorialsList from 'components/TutorialsList'
const MobileSidebar = () => null
import { useLayoutData } from 'components/Layout/hooks'
import Title from 'components/Edition/Title'
import Upvote from 'components/Edition/Upvote'
import LikeButton from 'components/Edition/LikeButton'
import { Questions } from 'components/Squeak'
import { useRouter } from 'next/router'
import qs from 'qs'
import Breadcrumbs from 'components/Edition/Breadcrumbs'
import { CallToAction } from 'components/CallToAction'
import { IconFilter, IconSort, IconSpinner } from '@posthog/icons'
import { NewsletterForm } from 'components/NewsletterForm'
import BuiltBy from 'components/BuiltBy'
import TeamMember from 'components/TeamMember'
import ImageSlider from 'components/ImageSlider'
import ReaderView from 'components/ReaderView'
import { usePosts } from 'components/Edition/hooks/usePosts'
import { TreeMenu } from 'components/TreeMenu'
import { postsMenu as menu } from 'navs/posts'
import MenuBar from 'components/RadixUI/MenuBar'
import slugify from 'slugify'
import { getVideoClasses } from 'constants'
import {
    fetchSupabasePostBySlug,
    normalizePostSlug,
    type SupabasePost,
} from 'lib/supabaseBlog'

const A = (props) => <Link {...props} state={{ newWindow: true }} />

function extractSlugFromPath(path?: string): string {
    if (!path) return ''
    const parts = path.split('/').filter(Boolean)
    // /posts/my-slug or /blog/my-slug
    if (parts.length >= 2 && (parts[0] === 'posts' || parts[0] === 'blog')) {
        return normalizePostSlug(parts.slice(1).join('/'))
    }
    return normalizePostSlug(parts[parts.length - 1] || '')
}

function extractTableOfContents(content?: string) {
    if (!content) return []
    const headings: { url: string; value: string; depth: number }[] = []
    const mdRegex = /^(#{1,6})\s+(.+)$/gm
    let match
    while ((match = mdRegex.exec(content)) !== null) {
        const depth = match[1].length
        const rawText = match[2].trim().replace(/[*_~`]/g, '')
        const url = `#${slugify(rawText, { lower: true, strict: true })}`
        headings.push({ url, value: rawText, depth })
    }
    if (headings.length === 0) {
        const htmlRegex = /<h([1-6])(?:[^>]*id=["']([^"']+)["'])?[^>]*>(.*?)<\/h\1>/gi
        while ((match = htmlRegex.exec(content)) !== null) {
            const depth = parseInt(match[1], 10)
            const id = match[2]
            const rawText = match[3].replace(/<[^>]+>/g, '').trim()
            const url = id ? `#${id}` : `#${slugify(rawText, { lower: true, strict: true })}`
            headings.push({ url, value: rawText, depth })
        }
    }
    return headings
}

function supabaseToBlogData(post: SupabasePost, fullPath: string) {
    const date = post.created_at ? post.created_at.split('T')[0] : ''
    const author = post.author || 'WorldInMaking'
    const tableOfContents = extractTableOfContents(post.content || '')
    return {
        body: post.content || '',
        content: post.content || '',
        excerpt: post.excerpt || post.title || '',
        title: post.title,
        tableOfContents,
        frontmatter: {
            title: post.title,
            date,
            featuredImage: post.image_url ? { publicURL: post.image_url, url: post.image_url } : null,
            featuredVideo: null,
            contributors: [
                {
                    name: author,
                    role: 'Author',
                    image:
                        post.author_avatar ||
                        'https://res.cloudinary.com/dmukukwp6/image/upload/v1675204207/james_hawkins_posthog_031f7cf651.png',
                },
            ],
            tags: Array.isArray(post.tags) ? post.tags : post.category ? [post.category] : [],
        },
        fields: {
            slug: fullPath || `/posts/${normalizePostSlug(post.slug)}`,
        },
        date,
        createdAt: post.created_at,
    }
}

export const Intro = ({
    featuredImage,
    featuredVideo,
    title,
    featuredImageType,
    titlePosition = 'bottom',
    date,
    tags,
    imageURL,
    fullWidthContent = false,
}) => {
    return (
        <div className="mb-6">
            <div>
                <Title className="text-primary dark:text-primary-dark">{title}</Title>
                <p className="mb-1 opacity-70">{date}</p>
            </div>

            {featuredVideo && <iframe src={featuredVideo} className={getVideoClasses(fullWidthContent)} />}
            {!featuredVideo && featuredImage && (
                <CloudinaryImage className={`rounded-sm z-0 bg-accent rounded`} image={getImage(featuredImage)} />
            )}
        </div>
    )
}

export const Contributors = ({ contributors }) => {
    return contributors?.[0] ? (
        <>
            <div className="text-sm opacity-50 px-4 mb-2">Posted by</div>
            <div className={`mb-4 flex flex-col gap-4`}>
                {contributors.map(({ profile_id, image, name, role, profile }) => {
                    return (
                        <Contributor
                            url={profile_id && `/community/profiles/${profile_id}`}
                            image={profile?.avatar?.url || image}
                            name={profile ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') : name}
                            key={name}
                            role={profile?.companyRole || role}
                            text
                        />
                    )
                })}
            </div>
        </>
    ) : null
}

const ContributorsSmall = ({ contributors }) => {
    return contributors?.[0] ? (
        <div className="flex space-x-2 items-center mb-4">
            <div className="text-sm opacity-50">Posted by</div>

            <div>
                <ul className="flex list-none !m-0 !p-0 space-x-2">
                    {contributors.map(({ profile_id, name, profile, ...other }) => {
                        const image = profile?.avatar?.url || other?.image
                        const url = profile_id && `/community/profiles/${profile_id}`
                        const Container = url ? Link : 'div'
                        const gatsbyImage = image && getImage(image)
                        return (
                            <li className="!mb-0" key={name}>
                                <Container className="flex space-x-2 items-center" {...(url ? { to: url } : {})}>
                                    <span>
                                        {typeof image === 'string' ? (
                                            <CloudinaryImage
                                                width={50}
                                                className="w-6 h-6 border border-primary rounded-full"
                                                src={image}
                                            />
                                        ) : gatsbyImage ? (
                                            <CloudinaryImage
                                                image={gatsbyImage}
                                                alt={name}
                                                className="w-6 h-6 border border-primary rounded-full"
                                            />
                                        ) : (
                                            ''
                                        )}
                                    </span>
                                    <span>{name}</span>
                                </Container>
                            </li>
                        )
                    })}
                </ul>
            </div>
        </div>
    ) : null
}

const categoriesHideFromIndex = ['tutorials', 'customers', 'spotlight', 'changelog']
export const tagsHideFromIndex = ['Comparisons']

export const sortOptions = [
    {
        sort: ['score:desc', 'date:desc'],
        label: 'Popularity',
    },
    {
        sort: ['date:desc'],
        label: 'Newest',
    },
]

export const getParams = (root, tag, sort) => {
    return {
        sort,
        filters: {
            $and: [
                ...(root
                    ? [
                          {
                              $or: [
                                  {
                                      post_category: {
                                          folder: {
                                              $eq: root,
                                          },
                                      },
                                  },
                                  {
                                      crosspost_categories: {
                                          folder: {
                                              $eq: root,
                                          },
                                      },
                                  },
                              ],
                          },
                      ]
                    : [
                          {
                              post_category: {
                                  folder: {
                                      $notIn: categoriesHideFromIndex,
                                  },
                              },
                          },
                      ]),
                ...(tag
                    ? [
                          {
                              post_tags: {
                                  label: {
                                      $in: [tag],
                                  },
                              },
                          },
                      ]
                    : [
                          {
                              $or: [
                                  {
                                      post_tags: {
                                          label: {
                                              $notIn: tagsHideFromIndex,
                                          },
                                      },
                                  },
                                  {
                                      post_tags: {
                                          label: {
                                              $null: true,
                                          },
                                      },
                                  },
                              ],
                          },
                          {
                              $or: [
                                  {
                                      hideFromIndex: {
                                          $eq: false,
                                      },
                                  },
                                  {
                                      hideFromIndex: {
                                          $null: true,
                                      },
                                  },
                              ],
                          },
                      ]),
            ],
        },
    }
}

export const getSortOption = (root?: string) =>
    sortOptions[['blog', 'changelog', 'newsletter', 'spotlight'].includes(root) ? 1 : 0]

const Filters = ({ tag, setTag, sort, setSort, activeMenu }) => {
    return activeMenu?.children?.length > 0 ? (
        <div className="mb-1 flex items-center justify-between sticky top-0 z-10 pl-1.5">
            <h5 className="m-0 text-sm font-semibold">{activeMenu?.name}</h5>
            <div className="flex items-center">
                <MenuBar
                    menus={[
                        {
                            trigger: <IconFilter className="size-4" />,
                            items: [
                                {
                                    type: 'item',
                                    label: 'All',
                                    onClick: () => setTag(undefined),
                                    active: !tag,
                                },
                                ...activeMenu?.children?.map((child) => {
                                    return {
                                        type: 'item',
                                        label: child.name,
                                        onClick: () => {
                                            setTag(child.tag || child.name)
                                        },
                                        active: tag ? tag === child.tag || tag === child.name : false,
                                    }
                                }),
                            ],
                        },
                    ]}
                />
                <MenuBar
                    menus={[
                        {
                            trigger: <IconSort className="size-4" />,
                            items: sortOptions.map((option) => {
                                return {
                                    type: 'item',
                                    label: option.label,
                                    onClick: () => setSort(option),
                                    active: sort.label === option.label,
                                }
                            }),
                        },
                    ]}
                />
            </div>
        </div>
    ) : null
}
export default function BlogPost({ data = {}, pageContext = {}, mobile = false, path: pathProp }: any) {
    const router = useRouter()

    // Desktop windows: WindowRouter passes path=/posts/slug (browser URL may stay on /)
    const windowPath = pathProp || ''
    const [browserPath, setBrowserPath] = useState(() => {
        const asPath = router?.asPath || ''
        return asPath.split('?')[0].split('#')[0] || '/'
    })
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setBrowserPath(window.location.pathname)
        }
    }, [router?.asPath])

    const pathname =
        windowPath && /^\/(blog|posts)\//.test(String(windowPath))
            ? String(windowPath)
            : browserPath || String(windowPath) || '/'

    const rawPostData =
        data?.postData?.post || data?.postData || (pageContext as any)?.post || (pageContext as any)?.postData || {}
    const initialPostData = rawPostData?.attributes
        ? { ...rawPostData.attributes, ...rawPostData }
        : rawPostData
    const initialBody =
        initialPostData?.attributes?.body ||
        initialPostData?.attributes?.content ||
        initialPostData?.body ||
        initialPostData?.content ||
        ''

    // WIM: load HTML/markdown body from Supabase when props are empty (desktop window open)
    const slug = extractSlugFromPath(pathname) || extractSlugFromPath(windowPath)
    const [remote, setRemote] = useState<ReturnType<typeof supabaseToBlogData> | null>(null)
    const [remoteLoading, setRemoteLoading] = useState(!initialBody && !!slug)
    const [remoteMissing, setRemoteMissing] = useState(false)

    useEffect(() => {
        if (!slug) {
            setRemoteLoading(false)
            return
        }
        // Always refresh from Supabase so desktop windows get real content
        let cancelled = false
        setRemoteLoading(true)
        setRemoteMissing(false)
        fetchSupabasePostBySlug(slug)
            .then((row) => {
                if (cancelled) return
                if (row) {
                    setRemote(supabaseToBlogData(row, pathname.startsWith('/') ? pathname : `/posts/${slug}`))
                    setRemoteMissing(false)
                } else if (!initialBody) {
                    setRemote(null)
                    setRemoteMissing(true)
                }
            })
            .catch(() => {
                if (!cancelled && !initialBody) setRemoteMissing(true)
            })
            .finally(() => {
                if (!cancelled) setRemoteLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [slug, pathname])

    const postData = remote || initialPostData
    const body =
        remote?.body ||
        postData?.attributes?.body ||
        postData?.attributes?.content ||
        postData?.body ||
        postData?.content ||
        initialBody ||
        ''
    const excerpt = remote?.excerpt || postData?.excerpt || postData?.attributes?.excerpt || ''
    const fields = remote?.fields || postData?.fields || {}
    const frontmatter = remote?.frontmatter || postData?.frontmatter || postData?.attributes || postData || {}
    const {
        date = remote?.date || postData?.createdAt || postData?.publishedAt,
        title = remote?.title || postData?.title || postData?.subject || (remoteLoading ? 'Loading…' : 'Blog Post'),
        featuredImage,
        featuredImageCaption,
        featuredVideo,
        featuredImageType,
        contributors,
        tags,
        seo,
        lang,
    } = frontmatter
    const lastUpdated = postData?.parent?.fields?.gitLogLatestDate
    const filePath = postData?.parent?.relativePath
    const category = postData?.parent?.category
    const components = {
        h1: (props) => Heading({ as: 'h1', ...props }),
        h2: (props) => Heading({ as: 'h2', ...props }),
        h3: (props) => Heading({ as: 'h3', ...props }),
        h4: (props) => Heading({ as: 'h4', ...props }),
        h5: (props) => Heading({ as: 'h5', ...props }),
        h6: (props) => Heading({ as: 'h6', ...props }),
        inlineCode: InlineCode,
        blockquote: Blockquote,
        pre: MdxCodeBlock,
        MultiLanguage: MdxCodeBlock,
        img: ZoomImage,
        video: (props) => (
            <ZoomImage>
                <video {...props} />
            </ZoomImage>
        ),
        a: A,
        TutorialsSlider,
        TutorialsList,
        NewsletterForm,
        BuiltBy,
        TeamMember,
        ImageSlider,

        ...shortcodes,
    }
    const initialTag = undefined
    const { tableOfContents: pageContextToc, askMax, localizedRoot } = pageContext
    const effectiveToc = remote?.tableOfContents || pageContextToc || extractTableOfContents(body)
    const languageAlternates = pageContext.languageAlternates as LanguageAlternate[] | undefined
    const { fullWidthContent, theoMode } = useLayoutData()

    const [postID, setPostID] = useState()
    const [posthogInstance, setPosthogInstance] = useState()

    const initialRoot =
        localizedRoot ||
        (pathname.split('/')[1] === 'blog' || pathname.split('/')[1] === 'posts'
            ? pathname.split('/')[1]
            : pathname.split('/')[1] !== 'posts'
              ? pathname.split('/')[1]
              : 'blog')
    const activeMenu = useMemo(() => {
        return menu.find(({ url }) => url?.split('/')[1] === initialRoot)
    }, [initialRoot])
    const [root, setRoot] = useState(initialRoot || 'blog')
    const [sort, setSort] = useState(getSortOption(root))
    const [tag, setTag] = useState(initialTag)

    const [params, setParams] = useState(getParams(root, initialTag, getSortOption(root).sort))

    const { posts, isLoading, isValidating, fetchMore, mutate, hasMore } = usePosts({ params })

    useEffect(() => {
        if (window) {
            const instanceCookie = document.cookie
                .split('; ')
                ?.filter((row) => row.startsWith('ph_current_instance='))
                ?.map((c) => c.split('=')?.[1])?.[0]
            if (instanceCookie) {
                setPosthogInstance(instanceCookie)
            }
        }
    }, [])

    useEffect(() => {
        setParams(getParams(root, tag, sort.sort))
    }, [root, tag, sort])

    if (remoteLoading && !body) {
        return (
            <div className="p-8 text-secondary text-sm animate-pulse">Loading post content…</div>
        )
    }

    if (remoteMissing && !body) {
        return (
            <div className="p-8 text-primary max-w-xl">
                <h1 className="text-xl font-bold mb-2">Post not found</h1>
                <p className="text-secondary text-sm m-0">
                    No Supabase content for <code className="text-xs">{slug || pathname}</code>
                </p>
            </div>
        )
    }

    return (
        <>
            <SEO
                title={seo?.metaTitle || title + ' - WorldInMaking'}
                description={seo?.metaDescription || excerpt}
                article
                image={`${process.env.NEXT_PUBLIC_CLOUDFRONT_OG_URL}/${(fields?.slug || '').replace(/\//g, '')}.jpeg`}
                imageType="absolute"
                lang={lang || (languageAlternates ? 'en' : undefined)}
                languageAlternates={languageAlternates}
                documentRkey={
                    fields?.slug?.startsWith('/blog/')
                        ? (fields.slug || '').replace(/^\/blog\//, '').replace(/\/$/, '')
                        : undefined
                }
            />

            <ReaderView
                leftSidebar={
                    <div data-sidebar-label>
                        <Filters tag={tag} setTag={setTag} sort={sort} setSort={setSort} activeMenu={activeMenu} />
                        {isLoading ? (
                            <div className="space-y-2">
                                {Array.from({ length: 20 }).map((_, index) => (
                                    <div key={index} className="bg-accent h-8 w-full rounded-md animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <TreeMenu
                                key={`posts-${posts?.length}`}
                                activeUrl={
                                    localizedRoot
                                        ? languageAlternates?.find((alt) => alt.hrefLang === 'en')?.href
                                        : undefined
                                }
                                items={posts?.map((post) => {
                                    return {
                                        name: post.attributes.title,
                                        url: post.attributes.slug,
                                    }
                                })}
                            />
                        )}
                        {hasMore && (
                            <CallToAction
                                disabled={isValidating}
                                size="sm"
                                width="full"
                                className="my-2"
                                onClick={() => fetchMore()}
                            >
                                {isValidating ? <IconSpinner className="size-5 mx-auto animate-spin" /> : 'Load more'}
                            </CallToAction>
                        )}
                    </div>
                }
                body={{
                    type: 'mdx',
                    content: body,
                    featuredImage,
                    featuredImageCaption,
                    contributors,
                    date,
                    featuredVideo,
                    tags: (Array.isArray(tags) ? tags : []).map((tag) =>
                        typeof tag === 'string'
                            ? { label: tag, url: `/${root}/${slugify(tag, { lower: true })}` }
                            : tag
                    ),
                }}
                title={title}
                tableOfContents={effectiveToc}
                mdxComponents={components}
                homeURL={localizedRoot ? '/newsletter' : `/${root || 'posts'}`}
            />
        </>
    )
}
