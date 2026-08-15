import { IconBookmarkSolid, IconBookmark } from '@posthog/icons'
import OSButton from 'components/OSButton'
import Tooltip from 'components/RadixUI/Tooltip'
import { useUser } from 'hooks/useUser'
import { useApp } from '../../context/App'
import React, { useMemo } from 'react'
import { useWindow } from '../../context/Window'

interface Bookmark {
    title: string
    description: string
}

export default function BookmarkButton({
    bookmark,
    labels = { add: 'Bookmark this page', remove: 'Remove from bookmarks' },
}: {
    bookmark: Bookmark
    labels?: { add: string; remove: string }
}) {
    const { user, addBookmark, removeBookmark } = useUser()
    const { openSignIn } = useApp()
    const { appWindow } = useWindow()

    const isBookmarked = useMemo(
        () => user?.profile?.bookmarks?.some((b) => b.url === appWindow?.path),
        [user, appWindow?.path]
    )

    const handleBookmark = async (add: boolean) => {
        if (!user) {
            openSignIn()
            return
        }

        if (bookmark && appWindow?.path) {
            if (add) {
                await addBookmark({ ...bookmark, url: appWindow.path })
            } else {
                await removeBookmark({ ...bookmark, url: appWindow.path })
            }
        }
    }

    return (
        <Tooltip
            trigger={
                <OSButton
                    size="md"
                    icon={isBookmarked ? <IconBookmarkSolid /> : <IconBookmark />}
                    onClick={() => handleBookmark(!isBookmarked)}
                    aria-label={isBookmarked ? labels.remove : labels.add}
                    active={!!isBookmarked}
                />
            }
        >
            {isBookmarked ? labels.remove : labels.add}
        </Tooltip>
    )
}
