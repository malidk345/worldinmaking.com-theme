import React from 'react'
import { child, container } from 'components/CallToAction'

import Link from 'components/Link'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import isToday from 'dayjs/plugin/isToday'
import LikeButton from './LikeButton'
import HourglassLoader from 'components/HourglassLoader'
dayjs.extend(relativeTime)
dayjs.extend(isToday)

function Post({ id, title, date, publishedAt, authors, slug }) {
    const day = dayjs(date || publishedAt)

    return (
        <li className="flex gap-2">
            <div className="flex-shrink-0">
                <LikeButton slug={slug} postID={id} />
            </div>
            <span className={`flex items-center flex-shrink-0 flex-grow`}>
                <Link
                    state={{ newWindow: true }}
                    className={`m-0 font-semibold border-t border-b !leading-tight line-clamp-2 text-inherit flex-grow relative border-transparent hover:scale-[1.01] hover:top-[-.5px] active:top-[.5px] active:scale-[.99]`}
                    to={slug}
                >
                    <div className={`items-baseline`}>
                        <span className="mr-1 flex-1 line-clamp-1">{title}</span>
                        <span className={`font-medium leading-none text-[.933rem] text-secondary`} suppressHydrationWarning>
                            {day.isToday() ? 'Today' : day.fromNow()}
                        </span>
                        {authors?.data?.length > 0 && (
                            <span className={`ml-1 inline-flex items-center space-x-1 font-medium leading-none`}>
                                <span className="text-[.933rem]">by</span>
                                <ul className={`m-0 p-0 list-none flex`}>
                                    {authors?.data?.map(({ id, attributes: { firstName, lastName, username } }) => {
                                        const name = [firstName, lastName].filter(Boolean).join(' ')
                                        const handle = username || id
                                        return (
                                            <li className='even:before:content-[","] even:before:mr-1' key={id}>
                                                <Link
                                                    className="text-[.933rem]"
                                                    to={`/profile/${encodeURIComponent(String(handle))}`}
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
                </Link>
            </span>
        </li>
    )
}

export default function PostsTable({ posts, isLoading, hasMore, isValidating, fetchMore, articleView }) {
    return (
        <ul className="list-none p-0 m-0 space-y-4">
            {posts.map(({ id, attributes }, index) => {
                return <Post articleView={articleView} key={id} {...attributes} id={id} />
            })}
            {isLoading && (
                <li>
                    <HourglassLoader title="Loading posts..." />
                </li>
            )}
            {hasMore && (
                <li className="mt-4 md:mb-24 px-4">
                    {isValidating ? (
                        <HourglassLoader title="Loading more posts..." />
                    ) : (
                        <button
                            onClick={fetchMore}
                            disabled={isLoading || isValidating}
                            className={`${container()} w-full`}
                        >
                            <span className={`${child()}`}>Load more</span>
                        </button>
                    )}
                </li>
            )}
        </ul>
    )
}
