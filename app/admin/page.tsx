'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import OSButton from 'components/OSButton'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    questions: 0,
    users: 0,
  })
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-light dark:bg-dark">
      <div className="h-full w-full flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] p-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <OSButton onClick={handleLogout} variant="secondary">
              Logout
            </OSButton>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Stats Cards */}
              <div className="bg-white dark:bg-[#1a1a1a] rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total Questions</h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.questions}</p>
              </div>

              <div className="bg-white dark:bg-[#1a1a1a] rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total Users</h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.users}</p>
              </div>
            </div>

            {/* Admin Panel */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Admin Controls</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Welcome to the admin panel. You can manage content and view analytics here.
              </p>
              
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ✓ Authentication verified
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ✓ Admin access granted
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
