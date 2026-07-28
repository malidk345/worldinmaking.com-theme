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
import slugify from 'slugify'
import { usePaginatedPosts } from 'components/Edition/hooks/usePaginatedPosts'
import { IconSpinner } from '@posthog/icons'

const GridIcon = (props: any) => (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
    </svg>
)

const ListIcon = (props: any) => (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
)
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

export const BlogCard = ({ post }: { post: any }) => {
    const title = post.attributes?.title || 'Untitled Post'
    const slug = post.attributes?.slug || '#'
    const date = post.attributes?.date ? dayjs(post.attributes.date).format('MMM D, YYYY') : ''
    const category = post.attributes?.post_category?.data?.attributes?.label
    const featuredImage =
        post.attributes?.featuredImage?.url ||
        'https://res.cloudinary.com/dmukukwp6/image/upload/posthog.com/src/components/Blog/images/default.jpg'
    const authors = post.attributes?.authors?.data || []

    return (
        <div className="relative rounded-xl overflow-hidden z-10 h-64 w-full group border border-black/10 dark:border-white/10 shadow-md hover:shadow-xl transition-all duration-300">
            <Link className="!text-white !hover:text-white flex flex-col h-full w-full" to={slug}>
                <img
                    alt={title}
                    className="w-full h-full object-cover absolute inset-0 group-hover:scale-105 transition-transform duration-500"
                    src={featuredImage}
                />
                <div className="bg-gradient-to-t from-black/95 via-black/50 to-black/20 absolute inset-0 p-5 flex flex-col justify-between h-full w-full">
                    <div className="flex justify-between items-center">
                        {category && (
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white uppercase tracking-wider border border-white/20">
                                {category}
                            </span>
                        )}
                        <span className="text-xs text-white/80 font-medium ml-auto">{date}</span>
                    </div>
                    <div>
                        <h3 className="m-0 text-base md:text-lg font-bold text-white leading-snug line-clamp-2 drop-shadow-md group-hover:underline decoration-white/50 underline-offset-4">
                            {title}
                        </h3>
                        {authors.length > 0 && (
                            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/15">
                                {authors.slice(0, 2).map((author: any, idx: number) => {
                                    const name =
                                        [author.attributes?.firstName, author.attributes?.lastName]
                                            .filter(Boolean)
                                            .join(' ') || 'WorldInMaking'
                                    const avatar =
                                        author.attributes?.avatar?.url ||
                                        'https://res.cloudinary.com/dmukukwp6/image/upload/v1675204207/james_hawkins_posthog_031f7cf651.png'
                                    return (
                                        <div key={idx} className="flex items-center gap-1.5">
                                            <img
                                                src={avatar}
                                                className="w-5 h-5 rounded-full object-cover border border-white/30"
                                                alt={name}
                                            />
                                            <span className="text-xs text-white/90 font-medium">{name}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </Link>
        </div>
    )
}

export default function Posts({ pageContext = {} }: { pageContext?: any }) {
    const [loginModalOpen, setLoginModalOpen] = useState(false)
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
    const { allPostCategory } = {} as any
    const articleRef = useRef<HTMLDivElement>(null)
    const [authors, setAuthors] = useState<any[]>([])
    const [selectedTag, setSelectedTag] = useState(pageContext?.selectedTag)
    const [root, setRoot] = useState(pageContext?.root || null)
    const [selectedAuthor, setSelectedAuthor] = useState()
    const [sort, setSort] = useState(getSortOption(pageContext?.root).label)
    const [params, setParams] = useState(
        getParams(pageContext?.root, pageContext?.selectedTag, getSortOption(pageContext?.root).sort, selectedAuthor)
    )

    const allCategories = useMemo(
        () =>
            (allPostCategory?.nodes || []).filter(
                (category: any, index: number, self: any[]) =>
                    index === self.findIndex((c: any) => c.attributes.folder === category.attributes.folder)
            ),
        [allPostCategory]
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
        if (filters.post_tags) {
            setSelectedTag(filters.post_tags.value)
        }
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
                pagination: { page: 1, pageSize: 100 },
                filters: { authorPosts: { title: { $notNull: true } } },
            },
            { encodeValuesOnly: true }
        )
        fetch(`${process.env.NEXT_PUBLIC_SQUEAK_API_HOST}/api/profiles?${query}`)
            .then((res) => res.json())
            .then((data) => setAuthors(data?.data || []))
            .catch(() => {})
    }, [])

    useEffect(() => {
        const sortValue = sortOptions.find((option) => option.label === sort)?.sort
        setParams(getParams(root, selectedTag, sortValue, selectedAuthor))
        scrollToTop()
    }, [selectedTag, root, selectedAuthor, sort])

    return (
        <div data-scheme="primary" className="w-full h-full bg-primary text-primary">
            <PostsContext.Provider value={{ setLoginModalOpen }}>
                <SEO title="Posts - PostHog" />
                <Modal open={loginModalOpen} setOpen={setLoginModalOpen}>
                    <div className="px-4">
                        <div className="p-4 max-w-[450px] mx-auto relative rounded-md dark:bg-dark bg-light mt-12 border border-input">
                            <p className="m-0 text-sm font-bold dark:text-white">
                                Note: PostHog.com authentication is separate from your PostHog app.
                            </p>
                            <p className="text-sm my-2 dark:text-white">
                                We suggest signing up with your personal email.
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
                >
                    <div className="flex justify-end items-center mb-4 gap-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-colors ${
                                viewMode === 'grid'
                                    ? 'bg-black/10 dark:bg-white/20 text-primary font-bold'
                                    : 'text-muted hover:bg-black/5 dark:hover:bg-white/10'
                            }`}
                            title="Grid View"
                        >
                            <GridIcon className="size-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded-md transition-colors ${
                                viewMode === 'table'
                                    ? 'bg-black/10 dark:bg-white/20 text-primary font-bold'
                                    : 'text-muted hover:bg-black/5 dark:hover:bg-white/10'
                            }`}
                            title="Table View"
                        >
                            <ListIcon className="size-4" />
                        </button>
                    </div>

                    {posts.length > 0 && viewMode === 'grid' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                            {posts.map((post) => (
                                <BlogCard key={post.id} post={post} />
                            ))}
                        </div>
                    )}

                    {posts.length > 0 && viewMode === 'table' && (
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
                                { name: '', align: 'center', width: '40px' },
                                { name: 'Date', align: 'left', width: '120px' },
                                { name: 'Title', align: 'left', width: '3fr' },
                                { name: 'Tags', align: 'left', width: '1fr' },
                                { name: 'Author(s)', align: 'left', width: '1fr' },
                            ]}
                            rows={posts.map((post) => {
                                return {
                                    cells: [
                                        { content: <LikeButton postID={post.id} slug={post.attributes.slug} /> },
                                        {
                                            content: (
                                                <span className="text-muted font-semibold">
                                                    {dayjs(post.attributes.date).format('MMM D, YYYY')}
                                                </span>
                                            ),
                                        },
                                        {
                                            content: (
                                                <Link className="font-semibold flex-1" to={post.attributes.slug}>
                                                    {post.attributes.title}
                                                </Link>
                                            ),
                                        },
                                        {
                                            content: (
                                                <span className="text-sm text-secondary">
                                                    {post.attributes.post_category?.data?.attributes?.label || 'Article'}
                                                </span>
                                            ),
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
                                                            .join(' ') || 'WorldInMaking'
                                                        const photo = author.attributes?.avatar?.url
                                                        return (
                                                            <li key={author.id || name}>
                                                                <TeamMember name={name} photo={photo} />
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
        </div>
    )
}
