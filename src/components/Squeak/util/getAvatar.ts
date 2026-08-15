import { ProfileData, StrapiRecord } from 'lib/strapi'
import { resolveUserOrPhilosopherAvatar } from 'lib/user-portraits'

export default function getAvatarURL(profile: StrapiRecord<Pick<ProfileData, 'avatar' | 'gravatarURL'>> | undefined) {
    const username =
        (profile as { username?: string } | undefined)?.username ||
        profile?.attributes?.username ||
        undefined
    const raw =
        profile?.avatar?.url ||
        profile?.avatar?.data?.attributes?.url ||
        profile?.attributes?.avatar?.data?.attributes?.url ||
        profile?.gravatarURL ||
        profile?.attributes?.gravatarURL ||
        ''
    return resolveUserOrPhilosopherAvatar(username, raw) || raw || undefined
}
