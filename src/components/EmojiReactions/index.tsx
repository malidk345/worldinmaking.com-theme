import React, { useEffect, useState } from 'react'
import { useUser, User } from 'hooks/useUser'
import { useApp } from '../../context/App'
import { addRoadmapEmojiReaction, fetchRoadmapReactions, EmojiReaction } from 'hooks/useRoadmaps'
import { Popover } from 'components/RadixUI/Popover'
import { IconEmojiAdd } from '@posthog/icons'

const emojiMap = {
    hedgehog: '🦔',
    'raised-hands': '🙌',
    clap: '👏',
    'thumbs-up': '👍',
    'pinched-fingers': '🤌',
    'rock-on': '🤘',
    'nail-polish': '💅',
    surprised: '😮',
    exhale: '😮‍💨',
    shaking: '🫨',
    'mind-blown': '🤯',
    laugh: '😂',
    grin: '😁',
    cool: '😎',
    'heart-eyes': '😍',
    cowboy: '🤠',
    chef: '👨‍🍳',
    robot: '🤖',
    wizard: '🧙',
    sparkles: '✨',
    rocket: '🚀',
    eyes: '👀',
    hundred: '💯',
    fire: '🔥',
    heart: '❤️',
    'blue-heart': '💙',
    boom: '💥',
    check: '✅',
    plus: '➕',
    party: '🎉',
    'hot-pepper': '🌶️',
    brain: '🧠',
    ship: '🚢',
    zap: '⚡️',
    ribbon: '🎀',
    beers: '🍻',
    champagne: '🍾',
    dancer: '💃',
    'disco-ball': '🪩',
    target: '🎯',
    siren: '🚨',
    unicorn: '🦄',
    dinosaur: '🦖',
    rainbow: '🌈',
    bouquet: '💐',
    flag: '🏁',
    toolbox: '🧰',
    camera: '📷',
    graph: '📈',
}

export const ChangelogEmojiReactions = ({ roadmapId }: { roadmapId: number | string }) => {
    const { user, getJwt } = useUser()
    const { openSignIn } = useApp()
    const [reactions, setReactions] = useState<EmojiReaction[]>([])
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)

    // Fetch reactions on mount and when roadmapId changes
    useEffect(() => {
        fetchRoadmapReactions(roadmapId).then(setReactions)
    }, [roadmapId])

    const checkUserHasReacted = (reaction: EmojiReaction): boolean => {
        const profiles = reaction?.profiles ? reaction.profiles : []
        return profiles.some((profile) => profile.id === user?.profile?.id) ?? false
    }

    const performEmojiReaction = async (emojiKey: string, authenticatedUser?: User) => {
        const currentUser = authenticatedUser || user
        if (!currentUser) return

        try {
            const existingReaction = reactions.find((r) => r.emoji === emojiKey)
            const userHasReacted = existingReaction
                ? existingReaction.profiles?.some((profile) => profile.id === currentUser?.profile?.id) ?? false
                : false

            const jwt = await getJwt()

            if (!jwt) {
                return
            }

            await addRoadmapEmojiReaction({
                roadmapId: typeof roadmapId === 'string' ? parseInt(roadmapId) : roadmapId,
                emoji: emojiKey,
                remove: userHasReacted,
                jwt,
            })

            setIsEmojiPickerOpen(false)

            // Refetch reactions after update
            const updatedReactions = await fetchRoadmapReactions(roadmapId)
            setReactions(updatedReactions)
        } catch (error) {
        }
    }

    const handleEmojiSelect = async (emojiKey: keyof typeof emojiMap) => {
        if (!user) {
            openSignIn()
            setIsEmojiPickerOpen(false)
            return
        }

        await performEmojiReaction(emojiKey)
    }

    return (
        <>
            {reactions.map((reaction, index) => {
                const userHasReacted = checkUserHasReacted(reaction)
                return (
                    <button
                        key={index}
                        onClick={() => handleEmojiSelect(reaction.emoji as keyof typeof emojiMap)}
                        className={`rounded-lg px-2 flex flex-row items-center gap-x-1 hover:cursor-pointer border ${
                            userHasReacted
                                ? 'border-orange bg-orange/20 dark:bg-orange-dark/20 dark:border-orange-dark'
                                : 'bg-accent/30 hover:bg-accent/50 border-transparent hover:border-primary'
                        }`}
                    >
                        <span className="text-lg">{emojiMap[reaction.emoji]}</span>
                        <span
                            className={`text-xs ${
                                userHasReacted ? 'font-semibold text-orange-dark dark:text-white' : ''
                            }`}
                        >
                            {(reaction.profiles?.length ?? 0).toLocaleString()}
                        </span>
                    </button>
                )
            })}
            <Popover
                trigger={
                    <button className="bg-accent/30 rounded-lg px-3 py-1 flex flex-row items-center gap-x-1 hover:cursor-pointer hover:bg-accent/50 border border-transparent hover:border-primary mr-2">
                        <IconEmojiAdd className="w-4 h-4" />
                    </button>
                }
                contentClassName="border border-primary px-1 py-1"
                dataScheme="secondary"
                open={isEmojiPickerOpen}
                onOpenChange={setIsEmojiPickerOpen}
                side="top"
            >
                <div className="grid grid-cols-7 gap-1 px-2 max-h-[160px] overflow-y-auto scrollbar-hide">
                    {(Object.keys(emojiMap) as Array<keyof typeof emojiMap>).map((emojiKey, index) => (
                        <button
                            key={index}
                            onClick={() => handleEmojiSelect(emojiKey)}
                            className="text-xl hover:bg-accent/50 rounded transition-colors py-1 px-1.5"
                            title={emojiKey}
                        >
                            {emojiMap[emojiKey]}
                        </button>
                    ))}
                </div>
            </Popover>
        </>
    )
}

export default ChangelogEmojiReactions
