import { getParams, PostsContext } from 'components/Edition/Posts'
import Editor from 'components/Editor'
import OSTable from 'components/OSTable'
import SEO from 'components/seo'
import React, { Suspense, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import Link from 'components/Link'
import Avatar from 'components/Squeak/components/Avatar'
import CloudinaryImage from 'components/CloudinaryImage'
import Tooltip from 'components/RadixUI/Tooltip'
import ProgressBar from 'components/ProgressBar'
import { usePaginatedPosts } from 'components/Edition/hooks/usePaginatedPosts'
import Modal from 'components/Modal'
import { Authentication } from 'components/Squeak'
import { handleFromDisplayName } from 'lib/profile-path'
import hourglassAnimation from '../images/icons8-hourglass.json'
import hourglassAnimationWhite from '../images/icons8-hourglass-white.json'

const Lottie = dynamic(() => import('lottie-react'), { ssr: false, loading: () => null })

dayjs.extend(relativeTime)

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
    const [params] = useState(getParams(null, null, ['date:desc'], null))

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

    const { posts, isLoading, totalPages, currentPage, nextPage, prevPage, hasNextPage, hasPrevPage, goToPage } =
        usePaginatedPosts({ params, pageSize: 10, onPageChange: handlePageChange })

    return (
        <PostsContext.Provider value={{ setLoginModalOpen }}>
            <SEO
                title="posts"
                description="essays and writing on worldinmaking."
            />
            <Modal open={loginModalOpen} setOpen={setLoginModalOpen}>
                <div className="px-4">
                    <div className="p-4 max-w-[450px] mx-auto relative rounded-md dark:bg-dark bg-light mt-12 border border-input">
                        <p className="m-0 text-sm font-bold dark:text-white">
                            sign in to worldinmaking to continue.
                        </p>
                        <p className="text-sm my-2 dark:text-white">
                            use the email you registered with. there is no separate product login.
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
                maxWidth="100%"
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
                                                        <li key={author.id || name}>
                                                            <Link
                                                                to={href || '#'}
                                                                state={{ newWindow: true }}
                                                                className="inline-flex items-center gap-1.5 p-0.5 pr-1.5 border border-primary rounded-full bg-primary !no-underline hover:!underline cursor-pointer"
                                                            >
                                                                <Avatar
                                                                    image={avatarUrl || null}
                                                                    className="size-6"
                                                                />
                                                                <span className="text-sm font-semibold truncate max-w-[9rem]">
                                                                    {name}
                                                                </span>
                                                            </Link>
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
                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <Suspense fallback={null}>
                            <Lottie
                                animationData={hourglassAnimation}
                                className="size-6 opacity-75 dark:hidden"
                                title="Loading posts..."
                            />
                            <Lottie
                                animationData={hourglassAnimationWhite}
                                className="size-6 opacity-75 hidden dark:block"
                                title="Loading posts..."
                            />
                        </Suspense>
                    </div>
                )}
            </Editor>
        </PostsContext.Provider>
    )
}
