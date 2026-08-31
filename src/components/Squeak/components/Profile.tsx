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
    const role = profile?.attributes?.companyRole || (profile?.attributes as any)?.role
    const isPro = role === 'pro' || role === 'admin' || role === 'moderator'

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
            {isPro && (
                <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-sm bg-[#1E3A8A] text-white text-[9px] font-bold tracking-wider uppercase">
                    PRO
                </span>
            )}
        </Link>
    ) : null
}

export default Profile
