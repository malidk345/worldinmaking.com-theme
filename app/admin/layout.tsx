'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAdmin } from '@/hooks/useAdmin'
import { Loading } from 'components/Loading'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAdmin, loading } = useAdmin()

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/')
    }
  }, [isAdmin, loading, router])

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-light dark:bg-dark">
        <Loading />
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return <>{children}</>
}
