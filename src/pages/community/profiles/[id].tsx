import React from 'react'
import { useRouter } from 'next/router'
import ProfileView from 'components/Profile/ProfileView'

export default function CommunityProfilePage() {
    const router = useRouter()
    const { id } = router.query
    const normalizedId = Array.isArray(id) ? id[0] : id

    return <ProfileView profileIdOrUsername={normalizedId} />
}
