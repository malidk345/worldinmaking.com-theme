import { getParams, PostsContext } from 'components/Edition/Posts'
import Editor from 'components/Editor'
import SEO from 'components/seo'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import isToday from 'dayjs/plugin/isToday'
import Link from 'components/Link'
import qs from 'qs'
import { usePaginatedPosts } from 'components/Edition/hooks/usePaginatedPosts'
import { IconSpinner } from '@posthog/icons'
import LikeButton from 'components/Edition/LikeButton'
import Modal from 'components/Modal'
import { Authentication } from 'components/Squeak'

dayjs.extend(relativeTime)
dayjs.extend(isToday)

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

function WimposPostRow({ id, title, date, publishedAt, authors, slug }: any) {
    const day = dayjs(date || publishedAt)

    return (
        <li className="flex gap-2.5 items-center py-1.5 border-b border-black/5 dark:border-white/5 last:border-b-0">
            <div className="flex-shrink-0">
                <LikeButton slug={slug} postID={id} />
            </div>
            <span className="flex items-center flex-shrink-0 flex-grow min-w-0">
                <Link
                    state={{ newWindow: true }}
                    className="m-0 font-semibold border-t border-b !leading-tight line-clamp-2 text-inherit flex-grow relative border-transparent hover:scale-[1.005] hover:top-[-.5px] active:top-[.5px] active:scale-[.995] transition-all"
                    to={slug}
                >
                    <div className="flex items-baseline gap-2 flex-wrap sm:flex-nowrap">
                        <span className="mr-1 flex-1 line-clamp-1 font-semibold text-primary text-[15px]">{title}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-medium leading-none text-[.813rem] text-secondary">
                                {day.isToday() ? 'Today' : day.fromNow()}
                            </span>
                            {authors?.data?.length > 0 && (
                                <span className="ml-1 inline-flex items-center space-x-1 font-medium leading-none">
                                    <span className="text-[.813rem] text-muted">by</span>
                                    <ul className="m-0 p-0 list-none flex flex-wrap">
                                        {authors.data.map(({ id: authorId, attributes }: any) => {
                                            const name =
                                                [attributes?.firstName, attributes?.lastName]
                                                    .filter(Boolean)
                                                    .join(' ') || 'WorldInMaking'
                                            return (
                                                <li className='even:before:content-[","] even:before:mr-1' key={authorId || name}>
                                                    <Link
                                                        className="text-[.813rem] text-secondary hover:text-primary"
                                                        to={`/community/profiles/${authorId || 1}`}
                                                        state={{ newWindow: true }}
                                                    >
                                                        {name}
                                                    </Link>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </span>
                            )}
                        </div>
                    </div>
                </Link>
            </span>
        </li>
    )
}

export default function Posts({ pageContext = {} }: { pageContext?: any }) {
    const [loginModalOpen, setLoginModalOpen] = useState(false)
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

    const { posts, isLoading, isValidating, totalPages, currentPage, nextPage, prevPage, hasNextPage, hasPrevPage, goToPage } =
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
                    {posts.length > 0 && (
                        <ul className="list-none p-0 m-0 space-y-1 my-2">
                            {posts.map(({ id, attributes }: any) => (
                                <WimposPostRow key={id} id={id} {...attributes} />
                            ))}
                        </ul>
                    )}

                    {(isLoading || isValidating) && !posts.length && (
                        <div className="flex items-center justify-center py-12">
                            <IconSpinner className="size-7 opacity-60 animate-spin" />
                        </div>
                    )}
                </Editor>
            </PostsContext.Provider>
        </div>
    )
}
