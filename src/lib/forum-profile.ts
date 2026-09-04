import { formatDisplayName } from './display-name'
import { resolveUserOrPhilosopherAvatar } from './user-portraits'

export const FORUM_PROFILE_EMBED =
    'id,username,avatar_url,first_name,last_name'

export function forumProfileAttributes(row: {
    id?: string
    username?: string | null
    avatar_url?: string | null
    first_name?: string | null
    last_name?: string | null
} | null | undefined) {
    const names = formatDisplayName(row)
    const avatarUrl = resolveUserOrPhilosopherAvatar(row?.username, row?.avatar_url)
    return {
        username: names.username,
        firstName: names.firstName,
        lastName: names.lastName,
        gravatarURL: avatarUrl || '',
        avatar: avatarUrl
            ? {
                  data: {
                      attributes: {
                          url: avatarUrl,
                      },
                  },
              }
            : null,
    }
}
