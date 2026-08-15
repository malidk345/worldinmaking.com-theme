import React from 'react'
import { StrapiRecord, ProfileData } from 'lib/strapi'
import Avatar from './Avatar'
import getAvatarURL from '../util/getAvatar'
import Link from 'components/Link'
import { profileHref } from 'lib/profile-path'

type ProfileProps = {
    className?: string
    profile?: StrapiRecord<ProfileData>
}

export const Profile = ({ className, profile }: ProfileProps) => {
    const handle =
        profile?.attributes?.username ||
        profile?.attributes?.user?.data?.attributes?.username ||
        profile?.id ||
        ''
    const href = profileHref(handle)
    return profile?.attributes ? (
        <Link
            className={`flex items-center relative !no-underline hover:!underline ${className}`}
            to={href || '#'}
        >
            <div className="size-10 shrink-0 rounded-full mr-2.5 overflow-hidden">
                <Avatar
                    className="size-10"
                    image={getAvatarURL(profile?.attributes)}
                    color={profile.attributes.color}
                />
            </div>
            <strong>{profile.attributes.firstName || 'Anonymous'}</strong>
        </Link>
    ) : null
}

export default Profile
