import React from 'react'
import ProfileView from './ProfileView'
import { identifierFromProfilePath } from 'lib/profile-path'

/**
 * Window and catch-all routes pass `path` (`/profile/nietzsche`).
 * Next.js pages pass `profileIdOrUsername` from the route param.
 * Never ignore the path — an empty id used to fall back to the signed-in user.
 */
export default function ProfileWrapper({
    path,
    profileIdOrUsername,
}: {
    path?: string
    profileIdOrUsername?: string | number
}) {
    const fromPath = identifierFromProfilePath(path)
    const id = profileIdOrUsername ?? (fromPath || undefined)
    return <ProfileView profileIdOrUsername={id} />
}
