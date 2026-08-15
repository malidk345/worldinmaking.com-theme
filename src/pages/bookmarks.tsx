import HeaderBar from 'components/OSChrome/HeaderBar'
import { useUser } from 'hooks/useUser'
import React, { useEffect, useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import { IconBookmark } from '@posthog/icons'
import OSInput from 'components/OSForm/input'
import ProfileDocumentGrid from 'components/Profile/ProfileDocumentGrid'
import ScrollArea from 'components/RadixUI/ScrollArea'

export default function Bookmarks() {
    const { user, removeBookmark } = useUser()
    const [search, setSearch] = useState('')
    const bookmarks = user?.profile?.bookmarks || []
    const [filteredBookmarks, setFilteredBookmarks] = useState(bookmarks)

    const fuse = useMemo(
        () =>
            new Fuse(bookmarks, {
                keys: ['title', 'description', 'url'],
                includeMatches: true,
                threshold: 0.3,
            }),
        [bookmarks]
    )

    useEffect(() => {
        if (search.trim() === '') {
            setFilteredBookmarks(bookmarks)
            return
        }
        setFilteredBookmarks(fuse.search(search).map((result) => result.item))
    }, [search, bookmarks, fuse])

    return (
        <div data-scheme="primary" className="@container bg-primary text-primary h-full flex flex-col min-h-0">
            <HeaderBar
                showCustomLeft={
                    <div className="w-[min(16rem,70vw)]">
                        <OSInput
                            label="Search bookmarks"
                            showLabel={false}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search bookmarks"
                            size="sm"
                        />
                    </div>
                }
            />
            <ScrollArea className="flex-1 min-h-0">
                <div className="p-4">
                    {bookmarks.length > 0 ? (
                        filteredBookmarks.length > 0 ? (
                            <ProfileDocumentGrid
                                items={filteredBookmarks.map((bookmark) => ({
                                    key: bookmark.url,
                                    title: bookmark.title || bookmark.url,
                                    href: String(bookmark.url || '').replace('https://posthog.com', ''),
                                    excerpt: bookmark.description,
                                    date: bookmark.savedAt,
                                    onRemove: () =>
                                        removeBookmark({
                                            url: bookmark.url,
                                            title: bookmark.title,
                                            description: bookmark.description,
                                        }),
                                }))}
                            />
                        ) : (
                            <p className="text-muted m-0 text-sm">No bookmarks match that search.</p>
                        )
                    ) : (
                        <div className="text-center py-12">
                            <IconBookmark className="size-12 mx-auto mb-2 text-muted" />
                            <h3 className="text-lg font-semibold m-0">No bookmarks ...yet!</h3>
                            <p className="text-muted m-0">Start exploring and bookmark your favorite pages.</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
