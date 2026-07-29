import React from 'react'
import ProfilePage from '../../pages/community/profiles/[id]'

interface PublicProfileProps {
    username: string
}

export default function PublicProfile({ username }: PublicProfileProps) {
    return <ProfilePage />
}
