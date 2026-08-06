import { getParams, PostsContext } from 'components/Edition/Posts'
import Editor from 'components/Editor'
import OSTable from 'components/OSTable'
import SEO from 'components/seo'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import Link from 'components/Link'
import TeamMember from 'components/TeamMember'
import qs from 'qs'
import CloudinaryImage from 'components/CloudinaryImage'
import Tooltip from 'components/RadixUI/Tooltip'
import ProgressBar from 'components/ProgressBar'
import { usePaginatedPosts } from 'components/Edition/hooks/usePaginatedPosts'
import { IconSpinner } from '@posthog/icons'
import LikeButton from 'components/Edition/LikeButton'
import Modal from 'components/Modal'
import { Authentication } from 'components/Squeak'

dayjs.extend(relativeTime)

const sortOptions = [
    {
        sort: ['score:desc', 'date:desc'],
        label: 'Popularity',
    },
    {
        sort: ['date:desc'],
        label: 'Newest',
    },
]

const getSortOption = (root?: string | null) =>
    sortOptions[root && ['blog', 'changelog', 'newsletter', 'spotlight'].includes(root) ? 1 : 0]

export const FeaturedImage = ({ url }: { url: string }) => {
    const [isSmallImageLoaded, setIsSmallImageLoaded] = useState(false)
    const [isLargeImageLoaded, setIsLargeImageLoaded] = useState(false)

    return (
        <Tooltip
            trigger={
                <div data-scheme="secondary" className="bg-primary max-h-8 max-w-48 overflow-hidden rounded">
                    <CloudinaryImage
                        src={url as `https://res.cloudinary.com/${string}`}
                        imgClassName={`max-h-8 max-w-48 h-auto w-auto object-contain ${
                            !isSmallImageLoaded ? 'hidden' : ''
                        }`}
                        width={200}
                        onLoad={() => setIsSmallImageLoaded(true)}
                    />
                </div>
            }
        >
            <div className="relative min-h-4 min-w-12 max-h-72 max-w-72 transition-all">
                {!isLargeImageLoaded && (
                    <div className="flex items-center justify-center">
                        <div className="w-full">
                            <ProgressBar title="image" chrome={false} />
                        </div>
                    </div>
                )}
                <CloudinaryImage
                    src={url as `https://res.cloudinary.com/${string}`}
                    width={400}
                    onLoad={() => setIsLargeImageLoaded(true)}
                    className={!isLargeImageLoaded ? 'hidden' : ''}
                />
            </div>
        </Tooltip>
    )
}

export default function Posts({ pageContext = {} }: { pageContext?: any }) {
    const [loginModalOpen, setLoginModalOpen] = useState(false)
    const articleRef = useRef<HTMLDivElement>(null)
    const [authors, setAuthors] = useState<any[]>([])
    const [selectedTag, setSelectedTag] = useState(pageContext.selectedTag)
    const [root, setRoot] = useState(pageContext.root || null)
    const [selectedAuthor, setSelectedAuthor] = useState<any>()
    const [sort, setSort] = useState(getSortOption(pageContext.root).label)
    const [params, setParams] = useState(
        getParams(pageContext.root, pageContext.selectedTag, getSortOption(pageContext.root).sort, selectedAuthor)
    )

    const allCategories = useMemo(
        () => [
            { attributes: { label: 'Blog', folder: 'blog', post_tags: { data: [] } } },
            { attributes: { label: 'Changelog', folder: 'changelog', post_tags: { data: [] } } },
            { attributes: { label: 'Newsletter', folder: 'newsletter', post_tags: { data: [] } } },
            { attributes: { label: 'Spotlight', folder: 'spotlight', post_tags: { data: [] } } },
        ],
        []
    )

    const scrollToTop = () => {
        const viewport = articleRef.current?.closest('[data-radix-scroll-area-viewport]')
        viewport?.scrollTo({
            top: 0,
            behavior: 'smooth',
        })
    }

    const handlePageChange = () => {
        scrollToTop()
    }

    const { posts, isValidating, totalPages, currentPage, nextPage, prevPage, hasNextPage, hasPrevPage, goToPage } =
        usePaginatedPosts({ params, onPageChange: handlePageChange })

    const handleFilterChange = (filters: any) => {
        if (filters.root) {
            setRoot(filters.root.value)
        }
        if (filters.authors) {
            setSelectedAuthor(filters.authors.value)
        }
    }

    useEffect(() => {
        const query = qs.stringify(
            {
                sort: ['firstName'],
                pagination: {
                    page: 1,
                    pageSize: 100,
                },
                filters: {
                    authorPosts: {
                        title: {
                            $notNull: true,
                        },
                    },
                },
            },
            {
                encodeValuesOnly: true,
            }
        )
        const host = process.env.NEXT_PUBLIC_SQUEAK_API_HOST
        if (!host) {
            setAuthors([])
            return
        }
        fetch(`${host}/api/profiles?${query}`)
            .then((res) => res.json())
            .then((data) => {
                setAuthors(data?.data || [])
            })
            .catch(() => {
                setAuthors([])
            })
    }, [])

    useEffect(() => {
        const sortValue = sortOptions.find((option) => option.label === sort)?.sort
        setParams(getParams(root, selectedTag, sortValue, selectedAuthor))
        scrollToTop()
    }, [selectedTag, root, selectedAuthor, sort])

    return (
        <PostsContext.Provider value={{ setLoginModalOpen }}>
            <SEO title="Posts - PostHog" />
            <Modal open={loginModalOpen} setOpen={setLoginModalOpen}>
                <div className="px-4">
                    <div className="p-4 max-w-[450px] mx-auto relative rounded-md dark:bg-dark bg-light mt-12 border border-input">
                        <p className="m-0 text-sm font-bold dark:text-white">
                            Note: PostHog.com authentication is separate from your PostHog app.
                        </p>
                        <p className="text-sm my-2 dark:text-white">
                            We suggest signing up with your personal email. Soon you'll be able to link your PostHog app
                            account.
                        </p>
                        <Authentication
                            onAuth={() => setLoginModalOpen(false)}
                            showBanner={false}
                            showProfile={false}
                        />
                    </div>
                </div>
            </Modal>
            <Editor
                articleRef={articleRef}
                title="posts"
                type="psheet"
                maxWidth="100%"
                dataToFilter={posts}
                handleFilterChange={handleFilterChange}
                showFilters
                sortOptions={sortOptions.map((option) => ({
                    label: option.label,
                    value: option.label,
                }))}
                onSortChange={(value) => setSort(value)}
                defaultSortValue={sort}
                availableFilters={[
                    {
                        label: 'category',
                        value: 'root',
                        initialValue: root,
                        options: [
                            {
                                label: 'All',
                                value: null,
                            },
                            ...allCategories.map((category) => ({
                                label: category.attributes.label,
                                value: category.attributes.folder,
                            })),
                        ],
                        operator: 'eq',
                    },
                    ...(authors.length > 0
                        ? [
                              {
                                  label: 'author',
                                  value: 'authors',
                                  options: [
                                      {
                                          label: 'All',
                                          value: null,
                                      },
                                      ...authors.map((author) => {
                                          const name = [author.attributes?.firstName, author.attributes?.lastName]
                                              .filter(Boolean)
                                              .join(' ')
                                          return {
                                              label: name,
                                              value: author.id,
                                          }
                                      }),
                                  ],
                                  operator: 'includes',
                              },
                          ]
                        : []),
                ]}
            >
                {posts.length > 0 && (
                    <OSTable
                        width="full"
                        pagination={{
                            totalPages,
                            currentPage,
                            nextPage,
                            prevPage,
                            hasNextPage,
                            hasPrevPage,
                            goToPage,
                        }}
                        rowAlignment="top"
                        columns={[
                            {
                                name: '',
                                align: 'center',
                                width: '40px',
                            },
                            {
                                name: 'Date',
                                align: 'left',
                                width: '120px',
                            },
                            {
                                name: 'Title',
                                align: 'left',
                                width: '3fr',
                            },
                            {
                                name: 'Author(s)',
                                align: 'left',
                                width: '1fr',
                            },
                        ]}
                        rows={posts.map((post: any) => {
                            const featuredImageURL = post.attributes?.featuredImage?.url
                            return {
                                cells: [
                                    {
                                        content: <LikeButton postID={post.id} slug={post.attributes?.slug} />,
                                    },
                                    {
                                        content: (
                                            <span className="text-muted font-semibold text-xs whitespace-nowrap">
                                                {dayjs(post.attributes?.date).format('MMM D, YYYY')}
                                            </span>
                                        ),
                                    },
                                    {
                                        content: (
                                            <div className="flex justify-between items-start w-full">
                                                <Link className="font-semibold flex-1 text-[14.5px] leading-relaxed" to={post.attributes?.slug || '#'}>
                                                    {post.attributes?.title}
                                                </Link>
                                                {featuredImageURL ? (
                                                    <Link to={post.attributes?.slug} className="ml-2">
                                                        <FeaturedImage url={featuredImageURL} />
                                                    </Link>
                                                ) : null}
                                            </div>
                                        ),
                                        className: '!flex-row !pl-[.3rem] gap-2 text-left',
                                    },
                                    {
                                        content: (
                                            <ul className="list-none m-0 p-0 flex flex-wrap gap-1">
                                                {(post.attributes?.authors?.data || []).map((author: any) => {
                                                    const name = [
                                                        author.attributes?.firstName,
                                                        author.attributes?.lastName,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' ') || 'Author'
                                                    return (
                                                        <li key={author.id || name}>
                                                            <TeamMember name={name} photo />
                                                        </li>
                                                    )
                                                })}
                                            </ul>
                                        ),
                                    },
                                ],
                            }
                        })}
                    />
                )}
                {isValidating && !posts.length && (
                    <div className="flex items-center justify-center py-12">
                        <IconSpinner className="size-7 opacity-60 animate-spin" />
                    </div>
                )}
            </Editor>
        </PostsContext.Provider>
    )
}
