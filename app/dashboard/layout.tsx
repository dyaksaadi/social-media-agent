'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import insforge from '@/lib/insforge-client'
import AppSidebar from '@/components/dashboard/app-sidebar'
import AppHeader from '@/components/dashboard/app-header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [collapsed, setCollapsed] = useState(true)
  const [hasCampaign, setHasCampaign] = useState<boolean | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin')
    }
  }, [user, loading, router])

  useEffect(() => {
    const checkCampaign = async () => {
      if (!user) return

      try {
        const { data, error } = await insforge.database
          .from('campaigns')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (error || !data) {
          router.push('/campaigns/create')
        } else {
          setHasCampaign(true)
        }
      } catch {
        router.push('/campaigns/create')
      }
    }

    if (user) {
      checkCampaign()
    }
  }, [user, router])

  if (loading || !user || hasCampaign === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600 font-medium">Loading workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <AppSidebar
        userId={user.id}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />

      {/* Main Area */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          collapsed ? 'ml-[76px]' : 'ml-[260px]'
        }`}
      >
        <AppHeader />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
