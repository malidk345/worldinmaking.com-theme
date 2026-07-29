import React from 'react'
import { useRouter } from 'next/router'
import ProfileView from 'components/Profile/ProfileView'

export default function UsernameProfilePage() {
    const router = useRouter()
    const { username } = router.query
    const normalizedUsername = Array.isArray(username) ? username[0] : username

    return <ProfileView profileIdOrUsername={normalizedUsername} />
}
