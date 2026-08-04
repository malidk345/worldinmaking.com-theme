import React, { forwardRef } from 'react'
import clsx from 'clsx'

export interface UserBasicType {
    first_name?: string
    last_name?: string
    email?: string
}

export interface ProfilePictureProps {
    user?: UserBasicType | null
    name?: string
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
    showName?: boolean
    className?: string
    title?: string
    index?: number
    type?: 'person' | 'bot' | 'system'
}

export const ProfilePicture = forwardRef<HTMLSpanElement, ProfilePictureProps>(function ProfilePicture(
    { user, name, size = 'lg', showName, className, title, type = 'person' },
    ref
) {
    let email = user?.email
    if (user) {
        name =
            user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : user.email
    }

    const displayName = name || email || 'User'
    const initial = displayName.charAt(0).toUpperCase()
    const combinedNameAndEmail = name && email ? `${name} <${email}>` : displayName

    const pictureComponent = (
        <span className={clsx('ProfilePicture', size, className)} ref={ref} title={title || combinedNameAndEmail}>
            <span className="ProfilePicture__initial">{initial}</span>
        </span>
    )

    return !showName ? (
        pictureComponent
    ) : (
        <div className="profile-package" title={combinedNameAndEmail}>
            {pictureComponent}
            <span className="profile-name">{displayName}</span>
        </div>
    )
})
